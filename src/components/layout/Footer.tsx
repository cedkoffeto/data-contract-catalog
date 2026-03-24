export function Footer({ version = "V1" }: { version?: string }) {
  return (
    <footer className="mt-auto bg-white text-sm text-gray-400">
      <div className="mx-auto max-w-7xl px-6 py-5 md:flex md:items-center md:justify-between lg:px-8">
        <div className="flex justify-center space-x-6 md:order-2" />
        <div className="mt-8 md:order-1 md:mt-0">
          <p className="text-center leading-5 text-gray-400">
            Soutenu par l'équipe Datalake{version ? ` ${version}` : ""}
          </p>
        </div>
      </div>
    </footer>
  );
}
