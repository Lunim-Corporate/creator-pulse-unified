import { TrendingUp, Zap, BarChart3, Activity } from 'lucide-react';
import logo from "../public/assets/image-DNaKSDV2Vm6rz8yKS6WtuJwy4rLZwh.png"
import Image from 'next/image';

interface LandingPageProps {
  onGetStarted: () => void;
}

export function LandingPage({ onGetStarted }: LandingPageProps) {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center relative overflow-hidden">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 -left-32 w-96 h-96 bg-primary/20 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-1/4 -right-32 w-96 h-96 bg-accent/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-secondary/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }} />
      </div>

      <div className="relative z-10 max-w-5xl mx-auto px-6 text-center">
        <div className="mb-8 inline-flex items-center justify-center">
          <div className="relative">
            <div className="absolute inset-0 gradient-hero rounded-2xl blur-2xl opacity-60 animate-pulse" />
            <div className="relative p-6 bg-card/80 backdrop-blur-sm rounded-2xl border border-primary/20">
              <Image src={logo} alt="Creator Pulse" width={100} height={100}/>
            </div>
          </div>
        </div>

        <h1 className="text-7xl md:text-8xl font-black mb-6 tracking-tight">
          <span className="bg-gradient-to-r from-primary via-accent to-secondary bg-clip-text text-transparent animate-fade-in">
            Creator Pulse
          </span>
        </h1>

        <p className="text-xl md:text-2xl text-muted-foreground mb-12 max-w-2xl mx-auto leading-relaxed animate-fade-in" style={{ animationDelay: '0.1s' }}>
          Discover what filmmakers are talking about across social platforms.
          <span className="block mt-2 text-primary font-semibold">Analyze trends. Understand your audience. Create content that resonates.</span>
        </p>

        <button
          onClick={onGetStarted}
          className="group relative inline-flex items-center gap-3 px-10 py-5 text-lg font-bold text-primary-foreground bg-primary rounded-2xl overflow-hidden transition-all duration-300 hover:scale-105 hover:shadow-glow-strong animate-fade-in"
          style={{ animationDelay: '0.2s' }}
        >
          <div className="absolute inset-0 bg-gradient-to-r from-primary to-accent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          <span className="relative">Get Started</span>
          <Zap className="relative w-5 h-5 group-hover:rotate-12 transition-transform duration-300" />
        </button>

        <div className="mt-16 flex flex-wrap items-center justify-center gap-4 animate-fade-in" style={{ animationDelay: '0.3s' }}>
          <div className="flex items-center gap-2 px-5 py-3 bg-surface/80 backdrop-blur-sm rounded-full border border-border">
            <TrendingUp className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium text-foreground">Trend Analysis</span>
          </div>
          <div className="flex items-center gap-2 px-5 py-3 bg-surface/80 backdrop-blur-sm rounded-full border border-border">
            <BarChart3 className="w-4 h-4 text-secondary" />
            <span className="text-sm font-medium text-foreground">Multi-Platform</span>
          </div>
          <div className="flex items-center gap-2 px-5 py-3 bg-surface/80 backdrop-blur-sm rounded-full border border-border">
            <Activity className="w-4 h-4 text-accent" />
            <span className="text-sm font-medium text-foreground">Real-Time Insights</span>
          </div>
        </div>
      </div>
    </div>
  );
}
