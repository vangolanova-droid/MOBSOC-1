import imgJangoSoba from '../assets/images/jango_soba_leader_1786566209375.jpg';
import imgKawasaki from '../assets/images/kawasaki_poster_mob_1786566220696.jpg';
import imgUnicefSoba from '../assets/images/unicef_soba_alliance_1786566232234.jpg';
import imgPolioPosters from '../assets/images/polio_posters_display_1786566243075.jpg';
import imgMothersJango from '../assets/images/mothers_jango_meeting_1786566253317.jpg';
import imgFieldBriefing from '../assets/images/field_team_briefing_1786566265107.jpg';
import imgBrigadeGroup from '../assets/images/brigade_group_jango_1786566275166.jpg';
import imgRegistrationDesk from '../assets/images/registration_desk_field_1786566285057.jpg';

export interface FieldGalleryItem {
  id: string;
  titulo: string;
  subtitulo: string;
  legenda: string;
  categoria: 'Liderança Tradicional' | 'Logística de Campo' | 'Parceria Estratégica' | 'Sensibilização Direta' | 'Mobilização Social' | 'Capacitação Técnica' | 'Equipa de Campo' | 'Gestão & Controlo' | 'Comunicação Interpessoal';
  data: string;
  autor: string;
  local: string;
  imagemUrl: string;
  destaque?: boolean;
  lemaInstitucional?: string;
}

export const FIELD_GALLERY_ITEMS: FieldGalleryItem[] = [
  {
    id: 'field-photo-1',
    titulo: 'A Sabedoria Tradicional ao Serviço da Saúde Pública',
    subtitulo: 'Jango Mbumba Kupuco • Tambo do Soba',
    legenda: 'Sobas e autoridades tradicionais reunidos no Tambo do Soba, ouvindo com extrema atenção o plano de vacinação. O envolvimento da liderança comunitária é a chave indispensável para romper a hesitação e garantir a proteção de todas as crianças contra a pólio.',
    categoria: 'Liderança Tradicional',
    data: '12 Agosto 2026',
    autor: 'Mobilização Social Sumbe',
    local: 'Tambo do Soba, Sumbe',
    imagemUrl: imgJangoSoba,
    destaque: true,
  },
  {
    id: 'field-photo-2',
    titulo: 'Mobilidade e Proximidade: Nenhuma Comunidade Fica para Trás',
    subtitulo: 'Bairro Mbumba Kupuco • Rota Periférica',
    legenda: 'Equipas de mobilizadoras e técnicos de saúde em prontidão com o veículo motorizado de transporte (Kawaseki), equipados com cartazes oficiais da Campanha Nacional de Vacinação contra a Pólio para cobrir bairros de difícil acesso.',
    categoria: 'Logística de Campo',
    data: '12 Agosto 2026',
    autor: 'Equipa Logística SirDm',
    local: 'Bairro Mbumba Kupuco',
    imagemUrl: imgKawasaki,
    destaque: true,
  },
  {
    id: 'field-photo-3',
    titulo: 'Aliança Histórica pela Proteção das Crianças do Sumbe',
    subtitulo: 'Sobado Mbumba Kupuco • Abertura da Campanha',
    legenda: 'Representantes do Ministério da Saúde, especialistas do UNICEF em t-shirts azuis e autoridades tradicionais uniformizadas unidos sob o pórtico do Jango Comunitário, selando o compromisso conjunto de vacinar 100% dos menores de 5 anos.',
    categoria: 'Parceria Estratégica',
    data: '12 Agosto 2026',
    autor: 'Direção de Saúde & UNICEF',
    local: 'Jango Comunitário Mbumba Kupuco',
    imagemUrl: imgUnicefSoba,
    destaque: true,
  },
  {
    id: 'field-photo-4',
    titulo: 'Vozes Unidas: "Vamos Vacinar Todas as Crianças Menores de 5 Anos"',
    subtitulo: 'Campanha Nacional contra a Pólio',
    legenda: 'Mobilizadores comunitários, enfermeiros e Sobas exibem orgulhosamente os panfletos e cartazes ilustrados da vacinação contra a pólio. A informação clara e transparente é o maior escudo preventivo das famílias angolanas.',
    categoria: 'Sensibilização Direta',
    data: '12 Agosto 2026',
    autor: 'RH-MC Cuanza Sul',
    local: 'Pórtico Mbumba Kupuco',
    imagemUrl: imgPolioPosters,
  },
  {
    id: 'field-photo-5',
    titulo: 'O Protagonismo das Mães e Mobilizadoras no Coração do Bairro',
    subtitulo: 'Encontro Comunitário Sumbe',
    legenda: 'Mães, parteiras tradicionais e mobilizadoras do Bairro Mbumba Kupuco reunidas com a equipa de saúde. O diálogo direto com as mulheres transforma a comunidade em guardiã ativa da imunização infantil.',
    categoria: 'Mobilização Social',
    data: '12 Agosto 2026',
    autor: 'Coordenação de Saúde Comunitária',
    local: 'Jango Mbumba Kupuco',
    imagemUrl: imgMothersJango,
  },
  {
    id: 'field-photo-6',
    titulo: 'Preparação Rigorosa: Briefing de Pré-Campo com Supervisão',
    subtitulo: 'Tambo do Soba • Treino de Mobilizadores',
    legenda: 'A supervisora de saúde coordena a roda de instrução e alinhamento das rotas de casa em casa. Cada mobilizador recebe orientações técnicas de preenchimento do ODK Collect e abordagem interpessoal empática.',
    categoria: 'Capacitação Técnica',
    data: '12 Agosto 2026',
    autor: 'Supervisão Epidemiológica',
    local: 'Interior do Jango Mbumba Kupuco',
    imagemUrl: imgFieldBriefing,
  },
  {
    id: 'field-photo-7',
    titulo: 'Determinação e Foco: Equipa Unida por Cuanza Sul Livre da Pólio',
    subtitulo: 'Jango Comunitário do Sobado',
    legenda: 'Dezenas de agentes de saúde, voluntários, enfermeiros e autoridades locais posam frente ao Jango Mbumba Kupuco após o lançamento bem-sucedido das rondas de imunização e sensibilização social.',
    categoria: 'Equipa de Campo',
    data: '12 Agosto 2026',
    autor: 'Brigada Municipal do Sumbe',
    local: 'Pórtico Principal Mbumba Kupuco',
    imagemUrl: imgBrigadeGroup,
  },
  {
    id: 'field-photo-8',
    titulo: 'Coordenação no Terreno: Validação e Distribuição de Insumos',
    subtitulo: 'Galeria do Sobado • Centro Operacional',
    legenda: 'Técnicas de saúde e supervisoras organizam as fichas físicas e digitais de acompanhamento no posto fixo temporário dentro da Galeria do Soba, assegurando fluxo contínuo de dados para o SirDm.',
    categoria: 'Gestão & Controlo',
    data: '12 Agosto 2026',
    autor: 'Posto Central de Registo',
    local: 'Galería do Soba, Mbumba Kupuco',
    imagemUrl: imgRegistrationDesk,
  },
];

export const FIELD_MOTIVATIONAL_QUOTES = [
  {
    quote: 'Para Cada Criança, Imunização Integral: A nossa missão primordial no UNICEF é garantir que nenhuma criança em Cuanza Sul perca a dose salvadora contra a pólio.',
    author: 'Equipa de Mobilização Social UNICEF Angola',
    cargo: 'Liderança Estratégica & Saúde Infantil',
  },
  {
    quote: 'A preparação minuciosa dos mobilizadores no terreno e o diálogo respeitoso de casa em casa são os pilares que transformam dúvidas em confiança e vacinação plena.',
    author: 'Coordenador do Programa de Imunização • UNICEF',
    cargo: 'Operações de Campo & Resposta à Pólio',
  },
  {
    quote: 'Na nossa comunidade, nenhuma criança ficará desprotegida. O Sobado e o UNICEF trabalham de mãos dadas para que todas as famílias recebam as brigadas com alegria.',
    author: 'Soba Principal do Bairro Mbumba Kupuco',
    cargo: 'Autoridade Tradicional & Parceria UNICEF',
  },
  {
    quote: 'Com o ODK Collect e o SirDm apoiados pelo UNICEF, cada casa visitada e cada criança vacinada é registada em tempo real para cobertura de 100% no Sumbe.',
    author: 'Supervisão Técnica de Dados de Campo',
    cargo: 'Direção Municipal de Saúde & UNICEF',
  },
];
