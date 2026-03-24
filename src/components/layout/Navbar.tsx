import Image from "next/image";
import Link from "next/link";

export function Navbar() {
  return (
    <nav className="bg-white shadow-sm">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <div className="flex h-16 justify-between">
          <div className="flex">
            <div className="mr-6 flex flex-shrink-0 items-center">
              <Link className="flex items-center gap-3" href="/">
                <Image
                  alt="Attijariwafa bank"
                  className="h-10 w-10 rounded-xl"
                  height={40}
                  priority
                  src="/awb-icon.png"
                  width={40}
                />
                <span className="text-xl font-semibold text-gray-900">Data Contrats</span>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
}
