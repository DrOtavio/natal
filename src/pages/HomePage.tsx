import { ArrowDown, Gift, Heart, LockKeyhole, Sparkles, UserRoundPlus } from 'lucide-react'
import { ChristmasArt } from '../components/ChristmasArt'
import { RegistrationForm } from '../components/RegistrationForm'

const steps = [
  { number: '01', icon: UserRoundPlus, title: 'Entre na brincadeira', text: 'Faça sua inscrição e deixe uma dica de presente para ajudar quem tirar você.' },
  { number: '02', icon: LockKeyhole, title: 'Um segredo só seu', text: 'A organização faz o sorteio e entrega um link individual para cada participante.' },
  { number: '03', icon: Gift, title: 'Espalhe carinho', text: 'Abra seu link, descubra seu amigo secreto e prepare uma surpresa com a sua cara.' },
]

export function HomePage() {
  return (
    <>
      <section className="page-shell grid items-center gap-9 pb-20 pt-12 lg:grid-cols-[1.1fr_1fr] lg:pb-24 lg:pt-16">
        <div>
          <p className="eyebrow mb-6 flex items-center gap-2 text-wine"><Sparkles size={16} /> É tempo de celebrar nossas histórias</p>
          <h1 className="font-display text-[clamp(3.25rem,7vw,5.6rem)] leading-[1.06] tracking-tight text-forest">O melhor presente<br />é <span className="italic text-wine">estar junto.</span></h1>
          <p className="mt-6 max-w-lg text-lg leading-relaxed text-muted">O Natal da Família Oliveira começa aqui. Vamos trocar sorrisos, criar memórias e guardar um segredinho até a hora do abraço.</p>
          <div className="mt-8 flex flex-wrap items-center gap-6"><a href="#inscricao" className="button">Participar do amigo secreto <Gift size={17} /></a><a href="#como-funciona" className="flex items-center gap-2 text-sm text-muted hover:text-forest">Conheça a brincadeira <ArrowDown size={15} /></a></div>
          <p className="mt-7 flex items-center gap-2 text-xs tracking-wide text-muted"><Heart size={13} className="text-wine" /> Para a nossa família. Com todo o carinho.</p>
        </div>
        <ChristmasArt />
      </section>
      <div className="border-y border-forest/10 bg-sage/60 py-5"><p className="page-shell text-center font-display text-lg text-forest sm:text-xl">De todas as tradições, reunir a nossa família é a mais bonita. <span aria-hidden="true" className="ml-2 text-gold-dark">✧</span></p></div>
      <section id="como-funciona" className="page-shell scroll-mt-8 py-20">
        <div className="mb-10 text-center"><p className="eyebrow text-wine">Simples como um abraço</p><h2 className="mt-3 font-display text-4xl text-forest">Um pouco de mistério. Muito afeto.</h2></div>
        <div className="grid gap-6 md:grid-cols-3">{steps.map(({ number, icon: Icon, title, text }) => <article className="rounded-2xl border border-forest/10 bg-white/45 p-7" key={number}><div className="mb-6 flex items-center justify-between"><span className="grid size-11 place-items-center rounded-xl bg-sage text-forest"><Icon size={21} strokeWidth={1.5} /></span><span className="font-display text-3xl text-gold-dark/60">{number}</span></div><h3 className="font-display text-2xl text-forest">{title}</h3><p className="mt-3 text-sm leading-7 text-muted">{text}</p></article>)}</div>
      </section>
      <section id="inscricao" className="page-shell grid scroll-mt-8 gap-10 lg:grid-cols-[0.85fr_1fr] lg:gap-20">
        <div className="py-4 lg:py-10"><p className="eyebrow text-wine">Tem lugar para você</p><h2 className="mt-4 font-display text-4xl leading-tight text-forest sm:text-5xl">Seu nome na lista.<br />Seu carinho na festa.</h2><p className="mt-6 max-w-md leading-8 text-muted">A parte mais especial não cabe no embrulho. É saber que, mais uma vez, vamos celebrar juntos.</p><div className="my-8 h-px w-16 bg-gold" /><div className="space-y-5 text-sm text-muted"><p className="flex gap-3"><Gift size={19} className="shrink-0 text-wine" /> O valor do presente será combinado pela família.</p><p className="flex gap-3"><LockKeyhole size={19} className="shrink-0 text-forest" /> Seu amigo secreto só aparece no seu link individual.</p><p className="flex gap-3"><Heart size={19} className="shrink-0 text-wine" /> Data e local serão compartilhados pela organização.</p></div><p className="mt-10 font-display text-2xl italic text-forest">Que a nossa melhor tradição continue.</p></div>
        <RegistrationForm />
      </section>
    </>
  )
}
