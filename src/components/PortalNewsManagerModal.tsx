import React, { useState, useRef, useEffect } from 'react';
import { Newspaper, Plus, Trash2, Edit3, X, Check, Megaphone, Calendar, Tag, Image, Sparkles, Upload, UploadCloud, AlertCircle } from 'lucide-react';
import { PortalPost, User } from '../types';
import { sanitizeImageUrl, convertFileToDataUrl } from '../utils/imageUtils';

interface PortalNewsManagerModalProps {
  user: User;
  posts: PortalPost[];
  initialPostToEdit?: PortalPost | null;
  onSavePost: (post: PortalPost) => Promise<void>;
  onDeletePost: (id: string) => Promise<void>;
  onClose: () => void;
}

export const PortalNewsManagerModal: React.FC<PortalNewsManagerModalProps> = ({
  user,
  posts,
  initialPostToEdit,
  onSavePost,
  onDeletePost,
  onClose,
}) => {
  const [editingPost, setEditingPost] = useState<PortalPost | null>(initialPostToEdit || null);
  const [isCreating, setIsCreating] = useState(false);

  // Form states
  const [titulo, setTitulo] = useState(initialPostToEdit?.titulo || '');
  const [subtitulo, setSubtitulo] = useState(initialPostToEdit?.subtitulo || '');
  const [conteudo, setConteudo] = useState(initialPostToEdit?.conteudo || '');
  const [categoria, setCategoria] = useState<any>(initialPostToEdit?.categoria || 'Notícia');
  const [autor, setAutor] = useState(initialPostToEdit?.autor || user.nome || 'Administração SirDm');
  const [destaque, setDestaque] = useState(!!initialPostToEdit?.destaque);
  const [imagemUrl, setImagemUrl] = useState(initialPostToEdit?.imagemUrl || '');
  const [lemaInstitucional, setLemaInstitucional] = useState(initialPostToEdit?.lemaInstitucional || '');
  const [saving, setSaving] = useState(false);
  const [imageError, setImageError] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (initialPostToEdit) {
      setEditingPost(initialPostToEdit);
      setIsCreating(false);
      setTitulo(initialPostToEdit.titulo);
      setSubtitulo(initialPostToEdit.subtitulo || '');
      setConteudo(initialPostToEdit.conteudo);
      setCategoria(initialPostToEdit.categoria || 'Notícia');
      setAutor(initialPostToEdit.autor || user.nome);
      setDestaque(!!initialPostToEdit.destaque);
      setImagemUrl(initialPostToEdit.imagemUrl || '');
      setLemaInstitucional(initialPostToEdit.lemaInstitucional || '');
      setImageError(false);
    }
  }, [initialPostToEdit, user.nome]);

  const resetForm = () => {
    setEditingPost(null);
    setIsCreating(false);
    setTitulo('');
    setSubtitulo('');
    setConteudo('');
    setCategoria('Notícia');
    setAutor(user.nome || 'Administração SirDm');
    setDestaque(false);
    setImagemUrl('');
    setLemaInstitucional('');
    setImageError(false);
  };

  const handleStartCreate = () => {
    resetForm();
    setIsCreating(true);
  };

  const handleStartEdit = (p: PortalPost) => {
    setEditingPost(p);
    setIsCreating(false);
    setTitulo(p.titulo);
    setSubtitulo(p.subtitulo || '');
    setConteudo(p.conteudo);
    setCategoria(p.categoria || 'Notícia');
    setAutor(p.autor || user.nome);
    setDestaque(!!p.destaque);
    setImagemUrl(p.imagemUrl || '');
    setLemaInstitucional(p.lemaInstitucional || '');
    setImageError(false);
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const dataUrl = await convertFileToDataUrl(file);
      setImagemUrl(dataUrl);
      setImageError(false);
    } catch (err: any) {
      alert(err.message || 'Erro ao carregar imagem do ficheiro.');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!titulo.trim() || !conteudo.trim()) return;

    setSaving(true);
    try {
      const now = new Date();
      const sanitizedImg = sanitizeImageUrl(imagemUrl);
      const postToSave: PortalPost = {
        id: editingPost ? editingPost.id : `post-${now.getTime()}`,
        titulo: titulo.trim(),
        subtitulo: subtitulo.trim() || undefined,
        conteudo: conteudo.trim(),
        categoria,
        data: now.toISOString().split('T')[0],
        autor: autor.trim() || user.nome,
        destaque,
        imagemUrl: sanitizedImg || undefined,
        lemaInstitucional: lemaInstitucional.trim() || undefined,
        createdAt: editingPost ? editingPost.createdAt : now.toISOString(),
      };

      await onSavePost(postToSave);
      resetForm();
    } catch (err) {
      alert('Erro ao guardar notícia do portal: ' + (err instanceof Error ? err.message : String(err)));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-md overflow-y-auto">
      <div className="relative w-full max-w-3xl rounded-3xl border border-slate-700 bg-slate-900 p-6 shadow-2xl text-white space-y-6 max-h-[90vh] overflow-y-auto">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-tr from-blue-600 to-sky-400 font-black text-white shadow-lg">
              <Newspaper className="h-6 w-6" />
            </div>
            <div>
              <h2 className="text-lg font-black text-white uppercase tracking-tight">
                Gestão de Notícias & Publicações do Portal Inicial
              </h2>
              <p className="text-xs text-slate-400">
                Publicar comunicados, relatórios de mobilização e avisos visíveis na tela de login antes da autenticação.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="rounded-xl p-2 text-slate-400 hover:bg-slate-800 hover:text-white transition cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Action Bar */}
        {!isCreating && !editingPost && (
          <div className="flex items-center justify-between bg-slate-800/80 p-4 rounded-2xl border border-slate-700">
            <div>
              <span className="text-xs font-bold text-slate-300 block">
                Total de Publicações Ativas: {posts.length}
              </span>
              <span className="text-[11px] text-slate-400">
                As publicações aparecem automaticamente em formato de cartões na página de login do SirDm.
              </span>
            </div>

            <button
              onClick={handleStartCreate}
              className="flex items-center gap-2 rounded-xl bg-blue-600 hover:bg-blue-500 px-4 py-2.5 text-xs font-black text-white shadow-md transition active:scale-95 cursor-pointer"
            >
              <Plus className="h-4 w-4" />
              <span>Nova Publicação</span>
            </button>
          </div>
        )}

        {/* Form View for Create or Edit */}
        {(isCreating || editingPost) && (
          <form onSubmit={handleSubmit} className="bg-slate-800/90 p-5 rounded-2xl border border-slate-700 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-700 pb-3">
              <h3 className="text-sm font-black text-sky-400 uppercase tracking-wide">
                {editingPost ? 'Editar Publicação do Portal' : 'Nova Publicação para a Página Inicial'}
              </h3>
              <button
                type="button"
                onClick={resetForm}
                className="text-xs text-slate-400 hover:text-white font-bold"
              >
                Cancelar
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="md:col-span-2">
                <label className="block text-xs font-bold text-slate-300 uppercase mb-1">
                  Título da Notícia / Comunicado *
                </label>
                <input
                  type="text"
                  required
                  value={titulo}
                  onChange={(e) => setTitulo(e.target.value)}
                  placeholder="Ex: Reforço das Brigadas Móveis nos Bairros Chingo e Quissala"
                  className="w-full rounded-xl border border-slate-600 bg-slate-900 p-3 text-xs text-white font-bold placeholder-slate-500 outline-none focus:border-sky-400"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase mb-1">
                  Subtítulo / Bairro / Sector
                </label>
                <input
                  type="text"
                  value={subtitulo}
                  onChange={(e) => setSubtitulo(e.target.value)}
                  placeholder="Ex: Sumbe Urbano & Periferia"
                  className="w-full rounded-xl border border-slate-600 bg-slate-900 p-3 text-xs text-white placeholder-slate-500 outline-none focus:border-sky-400"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase mb-1">
                  Categoria
                </label>
                <select
                  value={categoria}
                  onChange={(e: any) => setCategoria(e.target.value)}
                  className="w-full rounded-xl border border-slate-600 bg-slate-900 p-3 text-xs font-bold text-white outline-none focus:border-sky-400"
                >
                  <option value="Notícia">Notícia</option>
                  <option value="Brigada Móvel">Brigada Móvel</option>
                  <option value="Aviso">Aviso</option>
                  <option value="Estatística">Estatística</option>
                  <option value="Guia">Guia / Orientação</option>
                </select>
              </div>

              <div className="md:col-span-2">
                <label className="block text-xs font-bold text-amber-300 uppercase mb-1 flex items-center gap-1.5">
                  <Sparkles className="h-3.5 w-3.5 text-amber-400" />
                  <span>Lema Institucional / Slogan Central da Campanha</span>
                </label>
                <input
                  type="text"
                  value={lemaInstitucional}
                  onChange={(e) => setLemaInstitucional(e.target.value)}
                  placeholder='Ex: "Para Cada Criança, Imunização & Vida Saudável"'
                  className="w-full rounded-xl border border-amber-500/40 bg-slate-900 p-3 text-xs text-amber-100 font-bold placeholder-slate-500 outline-none focus:border-amber-400"
                  id="input-portal-lema"
                />
                <p className="text-[10px] text-slate-400 mt-1">
                  Este lema é exibido em destaque no carrossel e no cabeçalho de mobilização da página inicial.
                </p>
              </div>

              <div className="md:col-span-2">
                <label className="block text-xs font-bold text-slate-300 uppercase mb-1">
                  Conteúdo Detalhado *
                </label>
                <textarea
                  required
                  rows={4}
                  value={conteudo}
                  onChange={(e) => setConteudo(e.target.value)}
                  placeholder="Escreva a descrição das atividades de mobilização, avisos de vacinação, metas alcançadas..."
                  className="w-full rounded-xl border border-slate-600 bg-slate-900 p-3 text-xs text-white leading-relaxed placeholder-slate-500 outline-none focus:border-sky-400"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase mb-1">
                  Autor / Entidade Emissora
                </label>
                <input
                  type="text"
                  value={autor}
                  onChange={(e) => setAutor(e.target.value)}
                  placeholder="Ex: Equipa de Saúde Pública ou Administrador"
                  className="w-full rounded-xl border border-slate-600 bg-slate-900 p-3 text-xs text-white placeholder-slate-500 outline-none focus:border-sky-400"
                />
              </div>

              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-300 uppercase">
                  Imagem Ilustrativa (Ficheiro Local ou Link)
                </label>

                {/* Upload or Link Options */}
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                  <input
                    type="file"
                    ref={fileInputRef}
                    accept="image/*"
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="flex items-center justify-center gap-2 rounded-xl bg-sky-500/20 border border-sky-400/40 hover:bg-sky-500/30 px-3.5 py-2.5 text-xs font-bold text-sky-300 transition"
                  >
                    <UploadCloud className="h-4 w-4 text-sky-400" />
                    <span>Carregar do Dispositivo</span>
                  </button>

                  <div className="flex-1">
                    <input
                      type="text"
                      value={imagemUrl}
                      onChange={(e) => {
                        setImagemUrl(e.target.value);
                        setImageError(false);
                      }}
                      placeholder="Ou cole o link da imagem (HTTPS / Google Drive / Unsplash)"
                      className="w-full rounded-xl border border-slate-600 bg-slate-900 p-2.5 text-xs text-white placeholder-slate-500 outline-none focus:border-sky-400"
                    />
                  </div>
                </div>

                {/* Live Image Preview */}
                {imagemUrl && (
                  <div className="relative mt-2 rounded-xl border border-slate-700 bg-slate-950 p-2 overflow-hidden flex items-center justify-between gap-3">
                    <div className="relative h-20 w-32 rounded-lg overflow-hidden bg-slate-900 flex-shrink-0">
                      <img
                        src={sanitizeImageUrl(imagemUrl)}
                        alt="Pré-visualização"
                        className="h-full w-full object-cover"
                        referrerPolicy="no-referrer"
                        onError={() => setImageError(true)}
                      />
                    </div>

                    <div className="flex-1 text-xs space-y-1">
                      {imageError ? (
                        <div className="flex items-center gap-1.5 text-rose-400 font-semibold">
                          <AlertCircle className="h-4 w-4" />
                          <span>Não foi possível carregar esta imagem do link. Verifique a URL ou selecione um ficheiro.</span>
                        </div>
                      ) : (
                        <div className="text-emerald-400 font-semibold flex items-center gap-1">
                          <Check className="h-3.5 w-3.5" />
                          <span>Imagem carregada com sucesso!</span>
                        </div>
                      )}
                      <p className="text-[10px] text-slate-400 truncate max-w-xs">{imagemUrl}</p>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        setImagemUrl('');
                        setImageError(false);
                      }}
                      className="p-1.5 rounded-lg bg-rose-500/20 text-rose-300 hover:bg-rose-500/30 transition"
                      title="Remover Imagem"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                )}

                {/* Preset Suggestions */}
                <div className="mt-2 flex flex-wrap gap-1.5">
                  <span className="text-[10px] text-slate-400 font-bold self-center mr-1">Imagens Rápidas:</span>
                  {[
                    { label: 'Brigada Móvel', url: 'https://images.unsplash.com/photo-1584515933487-779824d29309?auto=format&fit=crop&w=1200&q=80' },
                    { label: 'ODK / Digital', url: 'https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?auto=format&fit=crop&w=1200&q=80' },
                    { label: 'Diálogo', url: 'https://images.unsplash.com/photo-1532938911079-1b06ac7ceec7?auto=format&fit=crop&w=1200&q=80' },
                    { label: 'Saúde / PFA', url: 'https://images.unsplash.com/photo-1516549655169-df83a0774514?auto=format&fit=crop&w=1200&q=80' },
                    { label: 'Estatísticas', url: 'https://images.unsplash.com/photo-1526256262350-7da7584cf5eb?auto=format&fit=crop&w=1200&q=80' },
                  ].map((preset, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => {
                        setImagemUrl(preset.url);
                        setImageError(false);
                      }}
                      className="rounded-lg bg-slate-800 border border-slate-700 hover:border-sky-400 px-2 py-0.5 text-[10px] font-medium text-slate-300 hover:text-white transition"
                    >
                      + {preset.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="md:col-span-2 flex items-center gap-3 pt-2">
                <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-amber-300">
                  <input
                    type="checkbox"
                    checked={destaque}
                    onChange={(e) => setDestaque(e.target.checked)}
                    className="h-4 w-4 rounded border-slate-600 accent-amber-400"
                  />
                  <span>Destacar esta notícia no Banner Principal da Página Inicial</span>
                </label>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-700">
              <button
                type="button"
                onClick={resetForm}
                className="rounded-xl border border-slate-600 bg-slate-700 px-4 py-2.5 text-xs font-bold text-slate-300 hover:bg-slate-600"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={saving}
                className="flex items-center gap-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 px-6 py-2.5 text-xs font-black text-slate-950 shadow-md transition cursor-pointer"
              >
                <Check className="h-4 w-4 stroke-[3]" />
                <span>{saving ? 'A Guardar...' : editingPost ? 'Atualizar Publicação' : 'Publicar Agora'}</span>
              </button>
            </div>
          </form>
        )}

        {/* Existing Posts List */}
        <div className="space-y-3">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
            Publicações Registadas no Sistema:
          </h3>

          {posts.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-500 italic bg-slate-800/50 rounded-2xl border border-slate-700">
              Nenhuma notícia personalizada publicada ainda. O portal mostrará as notícias padrão de mobilização social.
            </div>
          ) : (
            <div className="space-y-3">
              {posts.map((p) => (
                <div
                  key={p.id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-2xl bg-slate-800/80 border border-slate-700 hover:border-slate-600 transition"
                >
                  <div className="space-y-1 max-w-xl">
                    <div className="flex items-center gap-2 flex-wrap text-[10px]">
                      <span className="rounded-full bg-sky-500/20 border border-sky-400/30 px-2 py-0.5 font-bold text-sky-300">
                        {p.categoria}
                      </span>
                      {p.destaque && (
                        <span className="rounded-full bg-amber-500/20 border border-amber-400/30 px-2 py-0.5 font-bold text-amber-300 flex items-center gap-1">
                          <Sparkles className="h-3 w-3" /> Destaque
                        </span>
                      )}
                      <span className="text-slate-400">• {p.data}</span>
                      <span className="text-slate-400">• {p.autor}</span>
                    </div>

                    <h4 className="text-sm font-bold text-white leading-tight">{p.titulo}</h4>
                    {p.lemaInstitucional && (
                      <div className="text-[11px] font-bold text-amber-300 italic flex items-center gap-1">
                        <Sparkles className="h-3 w-3 text-amber-400 shrink-0" />
                        <span>Lema: "{p.lemaInstitucional}"</span>
                      </div>
                    )}
                    <p className="text-xs text-slate-300 line-clamp-2">{p.conteudo}</p>
                  </div>

                  <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                    <button
                      onClick={() => handleStartEdit(p)}
                      className="p-2 rounded-xl bg-slate-700 hover:bg-slate-600 text-sky-300 transition cursor-pointer"
                      title="Editar esta publicação"
                    >
                      <Edit3 className="h-4 w-4" />
                    </button>
                    <button
                      onClick={async () => {
                        if (confirm(`Tem a certeza que deseja eliminar a notícia "${p.titulo}"?`)) {
                          await onDeletePost(p.id);
                        }
                      }}
                      className="p-2 rounded-xl bg-rose-950/80 hover:bg-rose-900 border border-rose-800/50 text-rose-300 transition cursor-pointer"
                      title="Eliminar esta notícia"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
