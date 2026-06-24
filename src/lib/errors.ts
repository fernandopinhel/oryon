export function translateError(error: unknown): string {
  const msg =
    error instanceof Error ? error.message
    : typeof error === 'string' ? error
    : ''

  if (!msg) return 'Ocorreu um erro inesperado. Tente novamente.'

  if (msg.includes('row-level security') || msg.includes('violates row-level'))
    return 'Você não tem permissão para realizar esta ação.'
  if (msg.includes('duplicate key') || msg.includes('unique constraint') || msg.includes('already exists'))
    return 'Este registro já existe.'
  if (msg.includes('violates foreign key') || msg.includes('foreign key constraint'))
    return 'Referência inválida. Verifique os dados informados.'
  if (msg.includes('not null violation') || msg.includes('null value in column'))
    return 'Campo obrigatório não preenchido.'
  if (msg.includes('invalid input syntax') || msg.includes('invalid value'))
    return 'Dados inválidos. Verifique os campos preenchidos.'
  if (msg.includes('check constraint'))
    return 'Valor fora do limite permitido.'
  if (msg.includes('JWT') || msg.includes('token is expired') || msg.includes('invalid token'))
    return 'Sessão expirada. Faça login novamente.'
  if (msg.includes('permission denied') || msg.includes('insufficient privilege'))
    return 'Sem permissão para esta ação.'
  if (msg.includes('Failed to fetch') || msg.includes('NetworkError') || msg.includes('fetch failed'))
    return 'Erro de conexão. Verifique sua internet e tente novamente.'
  if (msg.includes('timeout') || msg.includes('request timeout'))
    return 'Tempo esgotado. Tente novamente.'
  if (msg.includes('Payload Too Large') || msg.includes('413') || msg.includes('file size'))
    return 'Arquivo muito grande. Reduza o tamanho e tente novamente.'
  if (msg.includes('Object not found') || msg.includes('does not exist'))
    return 'Registro não encontrado.'
  if (msg.includes('Unauthorized') || msg.includes('401'))
    return 'Não autorizado. Faça login novamente.'

  // If message looks like raw English (starts with uppercase English words common in PG/PostgREST)
  if (/^(Error:|Failed|Could not|Unable to|Invalid|Unauthorized|Forbidden|FATAL|ERROR:|DETAIL:|HINT:)/i.test(msg))
    return 'Ocorreu um erro inesperado. Tente novamente.'

  return msg
}
