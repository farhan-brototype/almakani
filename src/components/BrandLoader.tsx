import markUrl from "@/assets/logo-mark.png";
import ringUrl from "@/assets/logo-ring.png";

/**
 * Al Makani brand badge: still centre logo with the badge lettering
 * rotating continuously around it.
 */
export function BrandLoader({ className = "" }: { className?: string }) {
  return (
    <div
      className={`relative aspect-square w-40 select-none sm:w-48 ${className}`}
      role="img"
      aria-label="Al Makani"
    >
      <img
        src={ringUrl}
        alt=""
        className="absolute inset-0 size-full animate-spin object-contain [animation-duration:10s]"
        draggable={false}
      />
      <div className="absolute inset-0 flex items-center justify-center">
        <img
          src={markUrl}
          alt="Al Makani"
          className="w-[62%] object-contain"
          draggable={false}
        />
      </div>
    </div>
  );
}
