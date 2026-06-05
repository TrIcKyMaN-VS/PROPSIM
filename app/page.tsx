import { LandingNav } from "@/components/landing/landing-nav"
import { Hero } from "@/components/landing/hero"
import { Stats } from "@/components/landing/stats"
import { Features } from "@/components/landing/features"
import { FirmsShowcase } from "@/components/landing/firms-showcase"
import { Pricing } from "@/components/landing/pricing"
import { FaqCta, Footer } from "@/components/landing/faq-cta"

export default function HomePage() {
  return (
    <div className="min-h-screen bg-background">
      <LandingNav />
      <main>
        <Hero />
        <Stats />
        <Features />
        <FirmsShowcase />
        <Pricing />
        <FaqCta />
      </main>
      <Footer />
    </div>
  )
}
