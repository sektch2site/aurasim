import { FavoritesList } from "@/components/NumberLists";

export const metadata = { title: "Избранное — Aura sim" };

export default function Page() {
  return (
    <div className="mx-auto max-w-3xl px-3 pt-4 sm:px-4 sm:pt-6">
      <h1 className="font-display mb-4 px-1 text-2xl font-extrabold">Избранное</h1>
      <FavoritesList />
    </div>
  );
}
