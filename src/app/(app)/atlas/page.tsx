import { redirect } from "next/navigation";

// The atlas is a tabbed view; /atlas/[category] is the real page. Land on the
// default tab so there is always a concrete, shareable category URL in the bar.
export default function AtlasPage() {
  redirect("/atlas/normal");
}
