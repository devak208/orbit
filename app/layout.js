import './globals.css'

export const metadata = {
  title: 'Project Hub - Modern Project Management',
  description: 'A beautiful, modern project management system inspired by Linear',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="antialiased">
        {children}
      </body>
    </html>
  )
}