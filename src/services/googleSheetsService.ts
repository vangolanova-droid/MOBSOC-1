import {
  getAuth,
  signInWithPopup,
  GoogleAuthProvider,
  onAuthStateChanged,
  User as FirebaseUser,
  signOut,
} from 'firebase/auth';
import app from '../lib/firebase';
import { Ficha, Mobilizador } from '../types';

const auth = getAuth(app);

const provider = new GoogleAuthProvider();
provider.addScope('https://www.googleapis.com/auth/spreadsheets');
provider.addScope('https://www.googleapis.com/auth/drive.file');

let isSigningIn = false;
let cachedAccessToken: string | null = null;

export const initGoogleAuth = (
  onAuthSuccess?: (user: FirebaseUser, token: string) => void,
  onAuthFailure?: () => void
) => {
  return onAuthStateChanged(auth, async (user: FirebaseUser | null) => {
    if (user) {
      if (cachedAccessToken) {
        if (onAuthSuccess) onAuthSuccess(user, cachedAccessToken);
      } else if (!isSigningIn) {
        cachedAccessToken = null;
        if (onAuthFailure) onAuthFailure();
      }
    } else {
      cachedAccessToken = null;
      if (onAuthFailure) onAuthFailure();
    }
  });
};

export const googleSignIn = async (): Promise<{
  user: FirebaseUser;
  accessToken: string;
} | null> => {
  try {
    isSigningIn = true;
    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (!credential?.accessToken) {
      throw new Error('Falha ao obter o token de acesso do Google Sheets.');
    }

    cachedAccessToken = credential.accessToken;
    return { user: result.user, accessToken: cachedAccessToken };
  } catch (error: any) {
    console.error('Erro de autenticação Google:', error);
    const errStr = JSON.stringify(error) + ' ' + (error?.message || '');
    
    if (
      error?.code === 'auth/popup-closed-by-user' ||
      errStr.includes('popup-closed-by-user')
    ) {
      throw new Error(
        'A janela do Google foi fechada antes de concluir a autorização. Por favor, clique novamente em "Iniciar Sessão com Google" e mantenha a janela aberta para conceder a permissão do Google Sheets.'
      );
    }
    if (
      error?.code === 'auth/access-denied' ||
      errStr.includes('access_denied') ||
      errStr.includes('403') ||
      errStr.includes('validação da Google')
    ) {
      throw new Error(
        'ERRO 403 (Access Denied): O seu projeto Firebase está em modo de teste e necessita que o e-mail (andmelo222@gmail.com) esteja registado como "Utilizador de Teste" no Google Cloud Console, ou que introduza um Token / use a exportação Excel rápida.'
      );
    }
    if (error?.code === 'auth/popup-blocked') {
      throw new Error(
        'O seu navegador bloqueou a janela pop-up de autenticação do Google. Por favor, ative a permissão de janelas pop-up no seu navegador e tente novamente.'
      );
    }
    if (error?.code === 'auth/cancelled-popup-request') {
      throw new Error(
        'A requisição de login anterior foi cancelada. Por favor, tente novamente.'
      );
    }
    if (error?.code === 'auth/unauthorized-domain') {
      throw new Error(
        'Este domínio não está autorizado no Firebase Authentication. Contacte o administrador para adicionar o domínio.'
      );
    }
    throw error;
  } finally {
    isSigningIn = false;
  }
};

export const getAccessToken = (): string | null => {
  return cachedAccessToken;
};

export const googleSignOut = async () => {
  await signOut(auth);
  cachedAccessToken = null;
};

export interface GoogleSheetFile {
  id: string;
  name: string;
  webViewLink?: string;
  modifiedTime?: string;
}

// Fetch user's Google Sheets spreadsheets from Google Drive
export async function listUserSpreadsheets(
  accessToken: string
): Promise<GoogleSheetFile[]> {
  try {
    const q = encodeURIComponent(
      "mimeType='application/vnd.google-apps.spreadsheet' and trashed=false"
    );
    const res = await fetch(
      `https://www.googleapis.com/drive/v3/files?q=${q}&fields=files(id,name,webViewLink,modifiedTime)&pageSize=20&orderBy=modifiedTime%20desc`,
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      }
    );
    if (!res.ok) {
      const errText = await res.text();
      console.error('Erro ao listar ficheiros do Drive:', errText);
      return [];
    }
    const data = await res.json();
    return data.files || [];
  } catch (err) {
    console.error('Erro de rede ao listar Google Sheets:', err);
    return [];
  }
}

// Create a new Google Spreadsheet on user's Drive
export async function createGoogleSpreadsheet(
  title: string,
  accessToken: string
): Promise<{ id: string; spreadsheetUrl: string }> {
  const response = await fetch('https://sheets.googleapis.com/v4/spreadsheets', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      properties: {
        title: title || 'SirDm - Dados de Mobilização de Saúde',
      },
    }),
  });

  if (!response.ok) {
    const errorMsg = await response.text();
    throw new Error(`Erro ao criar folha de cálculo no Google Sheets: ${errorMsg}`);
  }

  const data = await response.json();
  return {
    id: data.spreadsheetId,
    spreadsheetUrl: data.spreadsheetUrl,
  };
}

// Export Fichas de Mobilização to a Google Sheet
export async function exportFichasToGoogleSheet(
  spreadsheetId: string,
  fichas: Ficha[],
  accessToken: string,
  sheetName: string = 'Fichas_Mobilizacao'
): Promise<void> {
  // First ensure tab/sheet exists or format headers
  const headerRow = [
    'ID Ficha',
    'Data da Atividade',
    'Ronda da Campanha',
    'Província',
    'Município',
    'Comuna',
    'Bairro / Comunidade',
    'Mobilizador / Agente',
    'Contacto Telefónico',
    'Coordenação',
    'Total Pessoas Alcançadas',
    'Total Locais Visitados',
    'Pessoas Casa a Casa',
    'Pessoas Igrejas/Cultos',
    'Pessoas Praças/Mercados',
    'Pessoas Paragens/Candongueiros',
    'Aceitações (SIM)',
    'Recusas (NÃO)',
    'Data de Registo',
  ];

  const dataRows = fichas.map((f) => [
    f.id,
    f.data || '',
    f.ronda || '1ª Ronda',
    f.provincia || 'Cuanza-Sul',
    f.municipio || 'Sumbe',
    f.comuna || 'Sede',
    f.bairro || '',
    f.mobilizador || '',
    f.telefone || '',
    f.coordNome || '',
    f.totalPessoas || 0,
    f.totalLocais || 0,
    f.tableData?.casa?.[1] || 0,
    f.tableData?.igreja?.[1] || 0,
    f.tableData?.pracas?.[1] || 0,
    f.tableData?.paragem?.[1] || 0,
    f.sim || 0,
    f.nao || 0,
    f.createdAt || '',
  ]);

  const values = [headerRow, ...dataRows];

  // Append or overwrite values in specified range
  const range = `${sheetName}!A1:S${values.length + 1}`;

  // First try to clear existing content or update
  const res = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(
      sheetName + '!A1:Z1000'
    )}?valueInputOption=USER_ENTERED`,
    {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        range,
        majorDimension: 'ROWS',
        values,
      }),
    }
  );

  if (!res.ok) {
    // Fallback: If sheetName sheet doesn't exist, try default range Sheet1 or create sheet
    const fallbackRes = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/A1:S${values.length + 1}?valueInputOption=USER_ENTERED`,
      {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          range: `A1:S${values.length + 1}`,
          majorDimension: 'ROWS',
          values,
        }),
      }
    );

    if (!fallbackRes.ok) {
      const err = await fallbackRes.text();
      throw new Error(`Erro ao exportar dados para o Google Sheets: ${err}`);
    }
  }
}

// Export Mobilizadores to a Google Sheet
export async function exportMobilizadoresToGoogleSheet(
  spreadsheetId: string,
  mobilizadores: Mobilizador[],
  accessToken: string
): Promise<void> {
  const headerRow = [
    'ID Mobilizador',
    'Nome Completo',
    'Contacto Telefónico',
    'Morada / Bairro',
    'Função',
    'Ronda Ativa',
    'Coordenação',
    'Data de Registo',
  ];

  const dataRows = mobilizadores.map((m) => [
    m.id,
    m.nome || '',
    m.telefone || '',
    m.morada || '',
    m.funcao || 'Mobilizador Comunitário',
    m.ronda || '1ª Ronda',
    m.coordNome || '',
    m.createdAt || '',
  ]);

  const values = [headerRow, ...dataRows];

  const res = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/A1:J${values.length + 1}?valueInputOption=USER_ENTERED`,
    {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        range: `A1:J${values.length + 1}`,
        majorDimension: 'ROWS',
        values,
      }),
    }
  );

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Erro ao exportar mobilizadores para o Google Sheets: ${err}`);
  }
}
