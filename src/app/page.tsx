"use client";

import { useEffect, useMemo, useState } from "react";

type Contract = {
  id: string;
  title: string;
  details: string;
  startDate: string;
  durationDays: number;
  createdAt: string;
};

type ContractStatus = "pending" | "active" | "completed";
type FilterStatus = "all" | ContractStatus;
type Viewer = "yo" | "vos";

const STORAGE_KEY = "churris-contracts";

function formatInputDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function parseInputDate(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function addDays(date: Date, days: number) {
  const copy = new Date(date);
  copy.setDate(copy.getDate() + days);
  return copy;
}

function formatHumanDate(value: string) {
  return new Intl.DateTimeFormat("es-AR", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(parseInputDate(value));
}

function getEndDate(contract: Contract) {
  return addDays(parseInputDate(contract.startDate), contract.durationDays - 1);
}

function getContractStatus(contract: Contract): ContractStatus {
  const today = startOfDay(new Date());
  const startDate = parseInputDate(contract.startDate);
  const endDate = getEndDate(contract);

  if (today < startDate) {
    return "pending";
  }

  if (today > endDate) {
    return "completed";
  }

  return "active";
}

function getProgress(contract: Contract) {
  const status = getContractStatus(contract);

  if (status === "pending") {
    return 0;
  }

  if (status === "completed") {
    return 100;
  }

  const today = startOfDay(new Date());
  const startDate = parseInputDate(contract.startDate);
  const elapsedMs = today.getTime() - startDate.getTime();
  const elapsedDays = Math.floor(elapsedMs / 86_400_000) + 1;

  return Math.min(100, Math.max(0, Math.round((elapsedDays / contract.durationDays) * 100)));
}

function getStatusLabel(status: ContractStatus) {
  if (status === "pending") {
    return "Pendiente";
  }

  if (status === "active") {
    return "En progreso";
  }

  return "Finalizado";
}

function getStatusClasses(status: ContractStatus) {
  if (status === "pending") {
    return "border-stone-200 bg-stone-50 text-stone-600";
  }

  if (status === "active") {
    return "border-violet-200 bg-violet-50 text-violet-700";
  }

  return "border-emerald-200 bg-emerald-50 text-emerald-700";
}

const FILTERS: { key: FilterStatus; label: string }[] = [
  { key: "all", label: "Todos" },
  { key: "pending", label: "Pendientes" },
  { key: "active", label: "En progreso" },
  { key: "completed", label: "Finalizados" },
];

export default function Home() {
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [hasLoadedContracts, setHasLoadedContracts] = useState(false);
  const [filter, setFilter] = useState<FilterStatus>("all");
  const [viewer, setViewer] = useState<Viewer>("yo");
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [openContractId, setOpenContractId] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [details, setDetails] = useState("");
  const [startDate, setStartDate] = useState(() => formatInputDate(new Date()));
  const [durationDays, setDurationDays] = useState("3");

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      const savedContracts = window.localStorage.getItem(STORAGE_KEY);

      if (savedContracts) {
        try {
          const parsedContracts = JSON.parse(savedContracts) as Contract[];
          const onlySeedContracts =
            parsedContracts.length > 0 &&
            parsedContracts.every((contract) => contract.id.startsWith("sample-"));

          setContracts(onlySeedContracts ? [] : parsedContracts);
        } catch {
          setContracts([]);
        }
      } else {
        setContracts([]);
      }

      setHasLoadedContracts(true);
    });

    return () => window.cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    if (!hasLoadedContracts) {
      return;
    }

    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(contracts));
  }, [contracts, hasLoadedContracts]);

  const contractStats = useMemo(() => {
    const pending = contracts.filter((contract) => getContractStatus(contract) === "pending").length;
    const active = contracts.filter((contract) => getContractStatus(contract) === "active").length;
    const completed = contracts.filter(
      (contract) => getContractStatus(contract) === "completed",
    ).length;

    return {
      total: contracts.length,
      pending,
      active,
      completed,
    };
  }, [contracts]);

  const filteredContracts = useMemo(() => {
    const sortedContracts = [...contracts].sort((left, right) => {
      return getEndDate(left).getTime() - getEndDate(right).getTime();
    });

    if (filter === "all") {
      return sortedContracts;
    }

    return sortedContracts.filter((contract) => getContractStatus(contract) === filter);
  }, [contracts, filter]);

  function handleAddContract(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const normalizedTitle = title.trim();
    const normalizedDetails = details.trim();
    const parsedDuration = Number(durationDays);

    if (!normalizedTitle || !startDate || Number.isNaN(parsedDuration) || parsedDuration < 1) {
      return;
    }

    const nextContract: Contract = {
      id: crypto.randomUUID(),
      title: normalizedTitle,
      details: normalizedDetails || "Un acuerdo especial para ustedes dos.",
      startDate,
      durationDays: parsedDuration,
      createdAt: formatInputDate(new Date()),
    };

    setContracts((currentContracts) => [nextContract, ...currentContracts]);
    setTitle("");
    setDetails("");
    setStartDate(formatInputDate(new Date()));
    setDurationDays("3");
    setFilter("all");
    setIsFormOpen(false);
    setOpenContractId(nextContract.id);
  }

  return (
    <main className="min-h-screen bg-[#fcfafb] text-slate-900">
      <div className="mx-auto flex min-h-screen w-full max-w-5xl flex-col px-4 pb-28 pt-4 sm:px-5 md:px-8 md:pb-12 md:pt-5">
        <header className="flex flex-col gap-4 rounded-[24px] border border-stone-200 bg-white/95 px-4 py-4 shadow-[0_8px_30px_rgba(15,23,42,0.05)] sm:px-5 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xl font-semibold tracking-tight sm:text-2xl">Super cute</p>
          </div>

          <div className="grid w-full grid-cols-2 rounded-2xl border border-stone-200 bg-stone-50 p-1 md:w-auto">
            <button
              type="button"
              onClick={() => setViewer("yo")}
              className={`min-h-11 rounded-xl px-4 py-2 text-sm font-medium ${
                viewer === "yo" ? "bg-white text-slate-900 shadow-sm" : "text-stone-500"
              }`}
            >
              Usuario 1
            </button>
            <button
              type="button"
              onClick={() => setViewer("vos")}
              className={`min-h-11 rounded-xl px-4 py-2 text-sm font-medium ${
                viewer === "vos" ? "bg-white text-slate-900 shadow-sm" : "text-stone-500"
              }`}
            >
              Usuario 2
            </button>
          </div>
        </header>

        <section className="pt-8 sm:pt-10 md:pt-12">
          <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl md:text-5xl">
            Churris contratos
          </h1>
          <p className="mt-3 max-w-2xl text-base text-stone-500 sm:text-lg">
            Crea, organiza y hace seguimiento de sus acuerdos de a dos.
          </p>

          <button
            type="button"
            onClick={() => setIsFormOpen((current) => !current)}
            className="mt-6 inline-flex min-h-13 w-full items-center justify-center rounded-2xl bg-gradient-to-r from-rose-500 to-violet-500 px-6 py-4 text-base font-semibold text-white shadow-[0_12px_24px_rgba(168,85,247,0.14)] hover:from-rose-600 hover:to-violet-600 sm:mt-8"
          >
            {isFormOpen ? "Cerrar formulario" : "Nuevo contrato"}
          </button>
        </section>

        {isFormOpen ? (
          <section className="mt-6 rounded-[24px] border border-stone-200 bg-white p-4 shadow-[0_8px_30px_rgba(15,23,42,0.05)] sm:rounded-[28px] sm:p-5">
            <form className="grid gap-4 md:grid-cols-2" onSubmit={handleAddContract}>
              <label className="space-y-2 md:col-span-2">
                <span className="text-sm font-medium text-stone-700">Nombre del contrato</span>
                <input
                  className="min-h-12 w-full rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3 text-base outline-none focus:border-rose-300 focus:bg-white"
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  placeholder="Ej: contrato de 3 dias"
                  required
                />
              </label>

              <label className="space-y-2 md:col-span-2">
                <span className="text-sm font-medium text-stone-700">Descripcion</span>
                <textarea
                  className="min-h-28 w-full rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3 text-base outline-none focus:border-rose-300 focus:bg-white"
                  value={details}
                  onChange={(event) => setDetails(event.target.value)}
                  placeholder="Que incluye este contrato"
                />
              </label>

              <label className="space-y-2">
                <span className="text-sm font-medium text-stone-700">Fecha de inicio</span>
                <input
                  type="date"
                  className="min-h-12 w-full rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3 text-base outline-none focus:border-rose-300 focus:bg-white"
                  value={startDate}
                  onChange={(event) => setStartDate(event.target.value)}
                  required
                />
              </label>

              <label className="space-y-2">
                <span className="text-sm font-medium text-stone-700">Duracion en dias</span>
                <input
                  type="number"
                  min="1"
                  className="min-h-12 w-full rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3 text-base outline-none focus:border-rose-300 focus:bg-white"
                  value={durationDays}
                  onChange={(event) => setDurationDays(event.target.value)}
                  required
                />
              </label>

              <div className="flex flex-col gap-3 md:col-span-2 sm:flex-row">
                <button
                  type="submit"
                  className="min-h-12 rounded-2xl bg-gradient-to-r from-rose-500 to-violet-500 px-5 py-3 text-sm font-semibold text-white hover:from-rose-600 hover:to-violet-600"
                >
                  Guardar contrato
                </button>
                <button
                  type="button"
                  onClick={() => setIsFormOpen(false)}
                  className="min-h-12 rounded-2xl border border-stone-200 bg-white px-5 py-3 text-sm font-semibold text-stone-700"
                >
                  Cancelar
                </button>
              </div>
            </form>
          </section>
        ) : null}

        <section className="mt-6 sm:mt-8">
          <div className="flex gap-3 overflow-x-auto pb-2 no-scrollbar snap-x snap-mandatory">
            {FILTERS.map((option) => {
              const count =
                option.key === "all"
                  ? contractStats.total
                  : option.key === "pending"
                    ? contractStats.pending
                    : option.key === "active"
                      ? contractStats.active
                      : contractStats.completed;

              return (
                <button
                  key={option.key}
                  type="button"
                  onClick={() => setFilter(option.key)}
                  className={`flex min-h-11 shrink-0 snap-start items-center gap-2 rounded-full border px-4 py-3 text-sm font-medium ${
                    filter === option.key
                      ? "border-slate-900 bg-slate-900 text-white"
                      : "border-stone-200 bg-white text-stone-700"
                  }`}
                >
                  <span>{option.label}</span>
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs ${
                      filter === option.key ? "bg-white/20 text-white" : "bg-stone-100 text-stone-500"
                    }`}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        </section>

        <section className="mt-6 flex-1 rounded-[28px] border border-dashed border-stone-200 bg-white p-4 shadow-[0_8px_30px_rgba(15,23,42,0.04)] sm:mt-8 sm:rounded-[32px] sm:p-5 md:p-6">
          {filteredContracts.length === 0 ? (
            <div className="flex min-h-[340px] flex-col items-center justify-center text-center sm:min-h-[420px]">
              <div className="flex h-20 w-20 items-center justify-center rounded-full bg-stone-50 text-4xl text-stone-300 sm:h-24 sm:w-24">
                ○
              </div>
              <h2 className="mt-6 text-2xl font-semibold tracking-tight text-slate-900 sm:mt-8 sm:text-3xl">
                No hay contratos
              </h2>
              <p className="mt-3 max-w-md text-base leading-7 text-stone-500 sm:text-lg sm:leading-8">
                Todavia no tienen ningun contrato. Crea el primero para empezar.
              </p>
              <button
                type="button"
                onClick={() => setIsFormOpen(true)}
                className="mt-6 min-h-12 rounded-2xl border border-stone-200 bg-white px-5 py-3 text-base font-semibold text-stone-700 sm:mt-8"
              >
                Crear mi primer contrato
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredContracts.map((contract) => {
                const status = getContractStatus(contract);
                const progress = getProgress(contract);
                const endDate = getEndDate(contract);
                const isOpen = openContractId === contract.id;

                return (
                  <article
                    key={contract.id}
                    className="overflow-hidden rounded-[22px] border border-stone-200 bg-white"
                  >
                    <button
                      type="button"
                      onClick={() =>
                        setOpenContractId((currentId) =>
                          currentId === contract.id ? null : contract.id,
                        )
                      }
                      className="w-full p-4 text-left sm:p-5"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="truncate text-lg font-semibold tracking-tight text-slate-900 sm:text-xl">
                              {contract.title}
                            </h3>
                            <span
                              className={`rounded-full border px-3 py-1 text-xs font-medium ${getStatusClasses(status)}`}
                            >
                              {getStatusLabel(status)}
                            </span>
                          </div>

                          <div className="mt-3 space-y-2">
                            <div className="flex items-center justify-between text-sm text-stone-500">
                              <span>Progreso</span>
                              <span>{progress}%</span>
                            </div>
                            <div className="h-2 rounded-full bg-stone-100">
                              <div
                                className="h-2 rounded-full bg-gradient-to-r from-rose-400 to-violet-400"
                                style={{ width: `${progress}%` }}
                              />
                            </div>
                          </div>

                          <div className="mt-3 flex flex-col gap-1 text-sm text-stone-500 sm:flex-row sm:flex-wrap sm:items-center sm:gap-3">
                            <span>Inicio: {formatHumanDate(contract.startDate)}</span>
                            <span>Fin: {endDate.toLocaleDateString("es-AR")}</span>
                          </div>
                        </div>

                        <span className="pt-1 text-sm font-medium text-stone-400">
                          {isOpen ? "Cerrar" : "Abrir"}
                        </span>
                      </div>
                    </button>

                    {isOpen ? (
                      <div className="border-t border-stone-100 px-4 pb-4 pt-4 sm:px-5 sm:pb-5">
                        {contract.details ? (
                          <p className="text-sm leading-7 text-stone-500">{contract.details}</p>
                        ) : null}

                        <div className="mt-4 grid gap-2 text-sm text-stone-500 sm:grid-cols-3">
                          <p>Creado: {formatHumanDate(contract.createdAt)}</p>
                          <p>Inicio: {formatHumanDate(contract.startDate)}</p>
                          <p>Fin: {endDate.toLocaleDateString("es-AR")}</p>
                        </div>
                      </div>
                    ) : null}
                  </article>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
