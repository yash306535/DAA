import { Link } from "react-router-dom";
import { EmptyState } from "../components/ui";
import { Compass } from "lucide-react";

export default function NotFound() {
  return (
    <div className="mx-auto max-w-xl px-4 py-20">
      <EmptyState icon={<Compass />} title="Page not found">
        This block does not exist on our chain.
        <Link to="/" className="btn-primary mx-auto mt-5 flex w-fit">Back home</Link>
      </EmptyState>
    </div>
  );
}
