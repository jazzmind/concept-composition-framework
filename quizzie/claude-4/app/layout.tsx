import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Quizzie',
  description: 'Simple online quizzes to share based on URLs',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>
        <header className="header">
          <div className="container">
            <a href="/" className="brand">Quizzie</a>
            <div className="user-menu">
              <span className="username">Demo User</span>
              <button className="logout-btn">Logout</button>
            </div>
          </div>
        </header>
        <main className="main">
          {children}
        </main>
      </body>
    </html>
  )
}
