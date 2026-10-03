import { QueryClient } from '@tanstack/react-query'

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Dados locais: sem refetch por foco de janela, invalidamos após mutações
      refetchOnWindowFocus: false,
      retry: false
    }
  }
})
