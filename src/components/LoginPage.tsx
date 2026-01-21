import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Card,
  CardHeader,
  CardBody,
  CardFooter,
  Button,
  Input,
  Link
} from "@heroui/react";

export function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Login failed');
      }

      localStorage.setItem('token', data.token);
      navigate('/admin');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <Card className="w-full">
          <CardHeader className="flex flex-col gap-1 items-center pb-0">
            <h1 className="text-2xl font-bold">MEYTRICS</h1>
            <p className="text-small text-default-500">Sign in to admin dashboard</p>
          </CardHeader>

          <CardBody className="gap-4">
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              {error && (
                <div className="bg-danger-50 text-danger px-4 py-3 rounded-lg text-sm">
                  {error}
                </div>
              )}

              <Input
                label="Username"
                placeholder="Enter your username"
                type="text"
                value={username}
                onValueChange={setUsername}
                isRequired
                variant="bordered"
              />

              <Input
                label="Password"
                placeholder="Enter your password"
                type="password"
                value={password}
                onValueChange={setPassword}
                isRequired
                variant="bordered"
              />

              <Button
                color="primary"
                type="submit"
                isLoading={loading}
                className="w-full"
              >
                {loading ? 'Signing in...' : 'Sign In'}
              </Button>
            </form>
          </CardBody>

          <CardFooter className="justify-center pt-0">
            <Link href="/" size="sm" color="foreground" className="text-default-500">
              ← Back to status page
            </Link>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
