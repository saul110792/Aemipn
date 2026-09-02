import { StrictMode, useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from './lib/auth';
import { App } from './App';
import i18n from './lib/i18n';
import './styles.css';

/**
 * Cambiar de idioma reconstruye todo el árbol (key={idioma}) en vez de
 * depender de que cada componente use useTranslation(): así también se
 * refresca texto generado por funciones planas (etiqueta() en format.ts),
 * sin tener que tocar cada punto donde se llaman.
 */
function ConIdioma({ children }: { children: React.ReactNode }) {
  const [idioma, setIdioma] = useState(i18n.language);
  useEffect(() => {
    i18n.on('languageChanged', setIdioma);
    return () => {
      i18n.off('languageChanged', setIdioma);
    };
  }, []);
  return <div key={idioma}>{children}</div>;
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
      staleTime: 30_000,
    },
  },
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthProvider>
          <ConIdioma>
            <App />
          </ConIdioma>
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  </StrictMode>,
);
