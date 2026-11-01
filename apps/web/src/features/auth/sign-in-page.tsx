import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, signIn } from '../../shared/api/client';
import { queryKeys } from '../../shared/api/query-keys';

export function SignInPage() {
  const queryClient = useQueryClient();
  const status = useQuery({
    queryKey: queryKeys.setup,
    queryFn: () => api<{ registrationOpen: boolean }>('/api/setup/status'),
    retry: false,
  });
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const open = status.data?.registrationOpen === true;
  const submit = useMutation({
    mutationFn: async () => {
      if (open) {
        await api('/api/setup', {
          method: 'POST',
          body: JSON.stringify({ email, password, name: name || undefined }),
        });
      }
      await signIn(email, password);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.session });
    },
    onError: (reason: Error) => setError(reason.message),
  });

  return (
    <div className="auth-screen">
      <form className="auth-card" onSubmit={(event) => { event.preventDefault(); setError(''); submit.mutate(); }}>
        <div className="brandline"><span className="brandmark">a.</span><span className="brandname">Atlas</span></div>
        <h1>{open ? '创建首个账号' : '登录复习工作台'}</h1>
        <p>{open ? '创建后公开注册会关闭。题目和解析都需要登录。' : '学习记录保存在服务器，今天按上海日历计算。'}</p>
        {status.isError ? <p className="auth-error">API 还没有连上。先启动数据库和 API。</p> : null}
        {open ? (
          <>
            <label htmlFor="name">称呼</label>
            <input id="name" className="search" value={name} onChange={(event) => setName(event.target.value)} autoComplete="name" />
          </>
        ) : null}
        <label htmlFor="email">邮箱</label>
        <input id="email" className="search" type="email" required value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="username" />
        <label htmlFor="password">密码</label>
        <input id="password" className="search" type="password" required minLength={8} value={password} onChange={(event) => setPassword(event.target.value)} autoComplete={open ? 'new-password' : 'current-password'} />
        <p className="auth-error">{error}</p>
        <button className="action primary" type="submit" disabled={submit.isPending || status.isPending}>{submit.isPending ? '提交中' : open ? '创建并登录' : '登录'}</button>
      </form>
    </div>
  );
}
