import { BundleCard } from "@/components/BundleCard";
import { PublishButton } from "@/components/Actions";
import { getBundles } from "@/lib/data";

export async function BundlesPage({ kind }: { kind: "pair" | "trio" }) {
  const all = await getBundles();
  const list = all.filter((b) => b.kind === kind);
  const title = kind === "pair" ? "Парные номера" : "Тройки номеров";
  const note = kind === "pair" ? "Созвучные номера для двоих — для пары, семьи или бизнеса" : "Три созвучных номера комплектом — выгоднее, чем по одному";
  return (
    <div className="mx-auto max-w-3xl px-3 pt-4 sm:px-4 sm:pt-6">
      <div className="mb-4 px-1">
        <div className="text-[10px] font-extrabold tracking-[0.2em] text-aura uppercase">Комплекты Aura sim</div>
        <h1 className="font-display text-2xl font-extrabold">{title}</h1>
        <p className="mt-1 text-sm text-ink-soft">{note}</p>
      </div>
      {list.length ? (
        <div className="grid gap-3 sm:grid-cols-2">
          {list.map((b) => (
            <BundleCard key={b.id} b={b} />
          ))}
        </div>
      ) : (
        <div className="card-glow rounded-3xl p-8 text-center text-ink-soft">
          Скоро здесь появятся {kind === "pair" ? "пары" : "тройки"}. Есть свой комплект?{" "}
          <PublishButton className="font-bold text-aura underline-offset-4 hover:underline">Опубликуйте его</PublishButton>
        </div>
      )}
    </div>
  );
}
