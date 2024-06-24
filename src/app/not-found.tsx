import "./globals.css";
import Footer from '@/components/footer'

export default function notFound() {
  return (
    <html lang="en">
      <head>
        <link rel="icon" href="/favicon.ico" />
      </head>
      <body className="flex flex-col items-center p-32 gap-2">
        <a href="/" className="text-black hover:underline mb-8">Home</a>
        <h1 className="text-5xl font-bold">You're lost aren't you...</h1>
        <h2 className="text-2xl font-light">404: Page Not Found.</h2>
        <div className="w-full absolute bottom-0">
            <Footer />
        </div>
      </body>
    </html>
  );
}
