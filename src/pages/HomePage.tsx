import { ArrowDown, ArrowUpRight, Gift, Heart, LockKeyhole, Sparkles, UserRoundPlus } from 'lucide-react'
import { ChristmasArt } from '../components/ChristmasArt'
import { FestiveLights } from '../components/FestiveLights'
import { RegistrationForm } from '../components/RegistrationForm'
import { ScrollReveal } from '../components/ScrollReveal'

const steps = [
  { number: '01', icon: UserRoundPlus, title: 'Entre na brincadeira', text: 'Faça sua inscrição e deixe uma dica de presente para ajudar quem tirar você.' },
  { number: '02', icon: LockKeyhole, title: 'Um segredo só seu', text: 'A organização faz o sorteio e entrega um link individual para cada participante.' },
  { number: '03', icon: Gift, title: 'Espalhe carinho', text: 'Abra seu link, descubra seu amigo secreto e prepare uma surpresa com a sua cara.' },
]

export function HomePage() {
  return (
    <>
      <section className="hero" aria-labelledby="hero-title">
        <FestiveLights />
        <div className="page-shell hero-grid">
          <div className="hero-copy">
            <div className="hero-copy-content">
              <p className="eyebrow hero-eyebrow"><span /> É tempo de celebrar nossas histórias</p>
              <h1 id="hero-title">O melhor presente<br />é <em>estar junto.</em></h1>
              <p className="hero-description">O Natal da Família Oliveira começa aqui. Vamos trocar sorrisos, criar memórias e guardar um segredinho até a hora do abraço.</p>
            </div>
            <div className="hero-actions"><a href="#inscricao" className="button button-gold">Participar do amigo secreto <ArrowUpRight size={18} aria-hidden="true" /></a><a href="#como-funciona" className="hero-more">Conheça a brincadeira <ArrowDown size={15} aria-hidden="true" /></a></div>
            <p className="hero-note"><Heart size={14} aria-hidden="true" /> Para a nossa família. Com todo o carinho.</p>
          </div>
          <ChristmasArt />
        </div>
        <div className="hero-bottom page-shell"><span>ENCONTROS QUE VIRAM MEMÓRIAS</span><span className="hero-bottom-center"><Sparkles size={13} aria-hidden="true" /> Nosso amigo secreto</span><a href="#como-funciona" aria-label="Descobrir como funciona"><ArrowDown size={17} aria-hidden="true" /></a></div>
      </section>

      <div className="tradition-band"><p className="page-shell"><span aria-hidden="true">✧</span> De todas as tradições, reunir a nossa família é a mais bonita. <span aria-hidden="true">✧</span></p></div>

      <section id="como-funciona" className="page-shell steps-section" aria-labelledby="steps-title">
        <ScrollReveal className="section-heading"><p className="eyebrow text-wine">Simples como um abraço</p><h2 id="steps-title">Um pouco de mistério.<br className="sm:hidden" /> <em>Muito afeto.</em></h2><p>Três pequenos passos para uma grande lembrança.</p></ScrollReveal>
        <div className="steps-grid">{steps.map(({ number, icon: Icon, title, text }) => <ScrollReveal key={number}><article className="step-card"><div className="step-card-top"><span className="step-icon"><Icon size={23} strokeWidth={1.4} aria-hidden="true" /></span><span className="step-number" aria-hidden="true">{number}</span></div><span className="step-rule" aria-hidden="true" /><h3>{title}</h3><p>{text}</p></article></ScrollReveal>)}</div>
      </section>

      <section id="inscricao" className="registration-section" aria-labelledby="registration-title">
        <div className="page-shell registration-grid">
          <ScrollReveal className="registration-copy"><p className="eyebrow text-wine">Tem lugar para você</p><h2 id="registration-title">Seu nome na lista.<br /><em>Seu carinho na festa.</em></h2><p className="registration-intro">A parte mais especial não cabe no embrulho. É saber que, mais uma vez, vamos celebrar juntos.</p><div className="gold-rule" aria-hidden="true" /><ul className="registration-details"><li><Gift size={19} aria-hidden="true" /><span>O valor do presente será combinado pela família.</span></li><li><LockKeyhole size={19} aria-hidden="true" /><span>Seu amigo secreto só aparece no seu link individual.</span></li><li><Heart size={19} aria-hidden="true" /><span>Data e local serão compartilhados pela organização.</span></li></ul><p className="registration-signature">Que a nossa melhor tradição continue.</p><span className="registration-flourish" aria-hidden="true">✧</span></ScrollReveal>
          <ScrollReveal className="registration-form-wrap"><RegistrationForm /></ScrollReveal>
        </div>
      </section>

      <ScrollReveal className="closing-note page-shell"><span className="closing-star" aria-hidden="true">✧</span><p>Os presentes são só o começo.<br /><em>O que fica é o carinho.</em></p><span className="eyebrow">Que venha mais um Natal juntos</span></ScrollReveal>
    </>
  )
}
