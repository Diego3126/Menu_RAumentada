import { ARBackground } from "@/components/ar-background"
import { LoginForm } from "@/components/login-form"

export default function LoginPage() {
  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden p-4">
      <ARBackground />
      
      {/* Contenido principal */}
      <div className="relative z-10 flex w-full items-center justify-center">
        <LoginForm />
      </div>

      {/* Info lateral decorativa - solo desktop */}
      <div className="absolute bottom-8 left-8 hidden max-w-xs lg:block">
        <div className="space-y-4 rounded-xl border border-border/30 bg-card/30 p-6 backdrop-blur-md">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/20">
              <svg className="h-5 w-5 text-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
                <circle cx="12" cy="12" r="3" />
              </svg>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-foreground">Menús en AR</h3>
              <p className="text-xs text-muted-foreground">Visualiza platos en 3D</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent/20">
              <svg className="h-5 w-5 text-accent" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                <line x1="3" y1="9" x2="21" y2="9" />
                <line x1="9" y1="21" x2="9" y2="9" />
              </svg>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-foreground">Panel Intuitivo</h3>
              <p className="text-xs text-muted-foreground">Gestiona tu restaurante</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/20">
              <svg className="h-5 w-5 text-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              </svg>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-foreground">Seguridad Total</h3>
              <p className="text-xs text-muted-foreground">Datos encriptados</p>
            </div>
          </div>
        </div>
      </div>

      {/* Stats decorativos - solo desktop */}
      <div className="absolute right-8 top-8 hidden lg:block">
        <div className="flex items-center gap-3 rounded-full border border-border/30 bg-card/30 px-4 py-2 backdrop-blur-md">
          <div className="h-2 w-2 animate-pulse rounded-full bg-green-500" />
          <span className="text-xs text-muted-foreground">Sistema operativo</span>
        </div>
      </div>
    </main>
  )
}
