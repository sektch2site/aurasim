/** Пока открывается страница — фирменный спиннер */
export default function Loading() {
  return (
    <div className="grid min-h-[60vh] place-items-center">
      <div className="aura-spin">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/brand.jpg" alt="" />
      </div>
    </div>
  );
}
