import DiscoverySignal from '@/components/discovery-signal'

function App() {
  return (
    <main
      className="relative min-h-dvh w-full touch-none select-none overflow-hidden bg-[#f7f5f1]"
      style={{ WebkitTouchCallout: 'none' }}
    >
      <DiscoverySignal backgroundColor="#f7f5f1" />

      <div className="relative z-10 flex min-h-dvh flex-col items-center justify-center px-[6vw] py-[8vh] text-center">
        <div className="flex max-w-[920px] flex-col items-center">
          <h1
            className="m-0 font-normal text-[#17160f]"
            style={{
              fontFamily: '"Newsreader", Georgia, "Times New Roman", serif',
              fontSize: 'clamp(2.5rem, 5.6vw, 4.6rem)',
              lineHeight: 1.14,
              letterSpacing: '-0.01em',
            }}
          >
            Frontier intelligence for
            <br />
            scientific <em className="italic">discovery</em>
          </h1>
          <p
            className="mx-auto mt-[1.9rem] max-w-[620px] font-normal text-[#5b584f]"
            style={{
              fontFamily:
                '-apple-system, BlinkMacSystemFont, "SF Pro Text", "SF Pro Display", "Helvetica Neue", Helvetica, Arial, sans-serif',
              fontSize: 'clamp(1.02rem, 1.35vw, 1.2rem)',
              lineHeight: 1.55,
              letterSpacing: '-0.006em',
            }}
          >
            We believe the next generation of cures will be discovered by
            scientists working alongside AI. We&rsquo;re building an agent
            platform that helps researchers reason across the world&rsquo;s
            knowledge, run deeper investigations, and accelerate the path
            from hypothesis to breakthrough.
          </p>
        </div>
      </div>
    </main>
  )
}

export default App
