import kimobeMark from '@/assets/kimobe-mark.svg'

const Logo = () => {
  return (
    <div className="flex items-center gap-[0.6rem]">
      <img src={kimobeMark} alt="" className="h-[1.7rem] w-[1.7rem]" />
      <span
        className="font-normal text-[#17160f]"
        style={{
          fontFamily: '"Newsreader", Georgia, "Times New Roman", serif',
          fontSize: '1.25rem',
          letterSpacing: '-0.01em',
        }}
      >
        Kimobe
      </span>
    </div>
  )
}

export default Logo
