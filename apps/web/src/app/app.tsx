import { useQuery, useQueryClient } from '@tanstack/react-query';
import { SignInPage } from '../features/auth/sign-in-page';
import { StudyPage } from '../features/study/study-page';
import { ApiError, api } from '../shared/api/client';
import { queryKeys } from '../shared/api/query-keys';

type Me = { id: string; email: string; name: string };

// SpecNav treats "/" as a pathless layout. This SPA has no client router;
// Vite serves the same shell at this concrete capture URL.
export const studyShellRoute = { path: '/study' };

export function App() {
  const queryClient = useQueryClient();
  const session = useQuery({
    queryKey: queryKeys.session,
    queryFn: () => api<Me>('/api/me'),
    retry: false,
  });
  if (session.isPending) return <div className="auth-screen"><p>正在确认登录状态</p></div>;
  if (session.isError && session.error instanceof ApiError && session.error.status === 401) return <SignInPage />;
  if (session.isError) return <div className="auth-screen"><p className="auth-error">暂时无法连接 API。</p></div>;
  if (!session.data) return <SignInPage />;
  return (
    <StudyPage
      email={session.data.email}
      onSignedOut={() => {
        queryClient.clear();
        void queryClient.invalidateQueries({ queryKey: queryKeys.session });
      }}
    />
  );
}
