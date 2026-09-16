import '../src/index.css'
import '../src/App.css'

export const metadata = {
  title: 'Quizapp',
  description: 'A focused quiz and assessment experience.',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}