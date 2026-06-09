import { Link } from "react-router";
import { POPPINS } from "@/app/constants";
import { ROUTES } from "@/app/routes";

export function NotFoundPage() {
  return (
    <main className="py-24 px-4 text-center">
      <h1 className="text-4xl font-bold mb-4" style={POPPINS}>404</h1>
      <p className="text-muted-foreground mb-8">Page not found.</p>
      <Link to={ROUTES.home} className="text-[11px] tracking-[0.15em] uppercase font-bold underline">
        Back to home
      </Link>
    </main>
  );
}
