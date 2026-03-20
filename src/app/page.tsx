"use client";

import { useEffect, useMemo, useState } from "react";

type Contract = {
  id: string;
  title: string;
  details: string;
  startDate: string;
  startTime?: string;
  endDate: string;
  endTime?: string;
  createdAt: string;
  createdByName: string;
  acceptedByName?: string;
  acceptedAt?: string;
};

type ContractStatus = "pending" | "active" | "completed";
type FilterStatus = "all" | ContractStatus;

function formatInputDate(date: Date) {
  return date.toISOString().slice(0, 10);
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

function formatHumanTime(value?: string) {
  if (!value) {
    return null;
  }

  return value.slice(0, 5);
}

function formatHumanDateTime(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  return new Intl.DateTimeFormat("es-AR", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function parseDateTime(dateValue: string, timeValue?: string, endOfDay = false) {
  const baseDate = parseInputDate(dateValue);

  if (timeValue) {
    const [hours, minutes] = timeValue.split(":").map(Number);
    return new Date(
      baseDate.getFullYear(),
      baseDate.getMonth(),
      baseDate.getDate(),
      hours,
      minutes,
      0,
      0,
    );
  }

  if (endOfDay) {
    return new Date(
      baseDate.getFullYear(),
      baseDate.getMonth(),
      baseDate.getDate(),
      23,
      59,
      59,
      999,
    );
  }

  return baseDate;
}

function getStartDateTime(contract: Contract) {
  return parseDateTime(contract.startDate, contract.startTime);
}

function getEndDateTime(contract: Contract) {
  return parseDateTime(contract.endDate, contract.endTime, true);
}

function getContractStatus(contract: Contract): ContractStatus {
  const now = new Date();
  const startDate = getStartDateTime(contract);
  const endDate = getEndDateTime(contract);

  if (now < startDate) {
    return "pending";
  }

  if (now > endDate) {
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

  const now = new Date();
  const startDate = getStartDateTime(contract);
  const endDate = getEndDateTime(contract);
  const totalMs = endDate.getTime() - startDate.getTime();

  if (totalMs <= 0) {
    return 100;
  }

  const elapsedMs = now.getTime() - startDate.getTime();
  return Math.min(100, Math.max(0, Math.round((elapsedMs / totalMs) * 100)));
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
  const [authStatus, setAuthStatus] = useState<"checking" | "unauthenticated" | "authenticated">(
    "checking",
  );
  const [currentUserName, setCurrentUserName] = useState("");
  const [loginUserName, setLoginUserName] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [isLoadingContracts, setIsLoadingContracts] = useState(true);
  const [requestError, setRequestError] = useState("");
  const [filter, setFilter] = useState<FilterStatus>("all");
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [openContractId, setOpenContractId] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [details, setDetails] = useState("");
  const [startDate, setStartDate] = useState(() => formatInputDate(new Date()));
  const [startTime, setStartTime] = useState("");
  const [endDate, setEndDate] = useState(() => formatInputDate(addDays(new Date(), 3)));
  const [endTime, setEndTime] = useState("");
  const [dateError, setDateError] = useState("");

  useEffect(() => {
    let isMounted = true;

    async function loadSession() {
      try {
        const response = await fetch("/api/auth/me", { cache: "no-store" });

        if (!response.ok) {
          throw new Error("No autenticado");
        }

        const data = (await response.json()) as { userName: string };

        if (isMounted) {
          setCurrentUserName(data.userName);
          setAuthStatus("authenticated");
        }
      } catch {
        if (isMounted) {
          setAuthStatus("unauthenticated");
        }
      }
    }

    void loadSession();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (authStatus !== "authenticated") {
      setIsLoadingContracts(false);
      return;
    }

    let isMounted = true;

    async function loadContracts() {
      setIsLoadingContracts(true);
      setRequestError("");

      try {
        const response = await fetch("/api/contracts", { cache: "no-store" });

        if (!response.ok) {
          if (response.status === 401) {
            setAuthStatus("unauthenticated");
          }
          throw new Error("No se pudo cargar");
        }

        const data = (await response.json()) as { contracts: Contract[] };

        if (isMounted) {
          setContracts(data.contracts ?? []);
        }
      } catch {
        if (isMounted) {
          setRequestError("No se pudieron cargar los contratos desde la base de datos.");
          setContracts([]);
        }
      } finally {
        if (isMounted) {
          setIsLoadingContracts(false);
        }
      }
    }

    void loadContracts();

    return () => {
      isMounted = false;
    };
  }, [authStatus]);

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
      return getEndDateTime(left).getTime() - getEndDateTime(right).getTime();
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
    const parsedStart = parseDateTime(startDate, startTime || undefined);
    const parsedEnd = parseDateTime(endDate, endTime || undefined, true);

    if (!normalizedTitle || !startDate || !endDate) {
      return;
    }

    if (parsedEnd.getTime() < parsedStart.getTime()) {
      setDateError("La fecha de finalizacion no puede ser anterior al inicio.");
      return;
    }

    setDateError("");

    const nextContractPayload = {
      id: crypto.randomUUID(),
      title: normalizedTitle,
      details: normalizedDetails || "Un acuerdo especial para ustedes dos.",
      startDate,
      startTime: startTime || undefined,
      endDate,
      endTime: endTime || undefined,
      createdAt: formatInputDate(new Date()),
    };

    void (async () => {
      try {
        setRequestError("");
        const response = await fetch("/api/contracts", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(nextContractPayload),
        });

        if (!response.ok) {
          throw new Error("No se pudo guardar");
        }

        const data = (await response.json()) as { contract: Contract };
        setContracts((currentContracts) => [data.contract, ...currentContracts]);
        setOpenContractId(nextContractPayload.id);
      } catch {
        setRequestError("No se pudo guardar el contrato en MongoDB.");
      }
    })();

    setTitle("");
    setDetails("");
    setStartDate(formatInputDate(new Date()));
    setStartTime("");
    setEndDate(formatInputDate(addDays(new Date(), 3)));
    setEndTime("");
    setFilter("all");
    setIsFormOpen(false);
  }

  async function handleLogin(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const normalizedUser = loginUserName.trim();

    if (normalizedUser.length < 2 || loginPassword.length === 0) {
      setLoginError("Completa usuario y contrasena.");
      return;
    }

    setIsLoggingIn(true);
    setLoginError("");

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userName: normalizedUser,
          password: loginPassword,
        }),
      });

      if (!response.ok) {
        const data = (await response.json()) as { message?: string };
        throw new Error(data.message ?? "No se pudo iniciar sesion.");
      }

      const data = (await response.json()) as { userName: string };

      setCurrentUserName(data.userName);
      setAuthStatus("authenticated");
      setLoginPassword("");
      setLoginError("");
    } catch (error) {
      const message = error instanceof Error ? error.message : "No se pudo iniciar sesion.";
      setLoginError(message);
    } finally {
      setIsLoggingIn(false);
    }
  }

  async function handleAcceptContract(contractId: string) {
    try {
      setRequestError("");
      const response = await fetch(`/api/contracts/${contractId}/accept`, {
        method: "PATCH",
      });

      if (!response.ok) {
        const data = (await response.json()) as { message?: string };
        throw new Error(data.message ?? "No se pudo aceptar el contrato.");
      }

      const data = (await response.json()) as { contract: Contract };
      setContracts((currentContracts) =>
        currentContracts.map((contract) => (contract.id === contractId ? data.contract : contract)),
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : "No se pudo aceptar el contrato.";
      setRequestError(message);
    }
  }

  async function handleDeleteContract(contractId: string) {
    const userConfirmed = window.confirm("Quieres eliminar este contrato?");

    if (!userConfirmed) {
      return;
    }

    try {
      setRequestError("");
      const response = await fetch(`/api/contracts/${contractId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const data = (await response.json()) as { message?: string };
        throw new Error(data.message ?? "No se pudo eliminar el contrato.");
      }

      setContracts((currentContracts) =>
        currentContracts.filter((contract) => contract.id !== contractId),
      );
      setOpenContractId((currentId) => (currentId === contractId ? null : currentId));
    } catch (error) {
      const message = error instanceof Error ? error.message : "No se pudo eliminar el contrato.";
      setRequestError(message);
    }
  }

  if (authStatus === "checking") {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#fcfafb] text-stone-500">
        Verificando acceso...
      </main>
    );
  }

  if (authStatus === "unauthenticated") {
    return (
      <main className="min-h-screen bg-[#fcfafb] px-4 py-8 text-slate-900">
        <div className="mx-auto flex min-h-[80vh] w-full max-w-md items-center">
          <section className="w-full rounded-[28px] border border-stone-200 bg-white p-5 shadow-[0_8px_30px_rgba(15,23,42,0.05)] sm:p-6">
            <h1 className="text-2xl font-semibold tracking-tight">Acceso privado</h1>
            <p className="mt-2 text-sm leading-7 text-stone-500">
              Ingresa tu nombre de usuario y la contrasena privada para entrar.
            </p>

            <form className="mt-5 space-y-4" onSubmit={handleLogin}>
              <label className="block space-y-2">
                <span className="text-sm font-medium text-stone-700">Usuario</span>
                <input
                  className="min-h-12 w-full rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3 text-base outline-none focus:border-rose-300 focus:bg-white"
                  value={loginUserName}
                  onChange={(event) => setLoginUserName(event.target.value)}
                  placeholder="Tu nombre"
                  required
                />
              </label>

              <label className="block space-y-2">
                <span className="text-sm font-medium text-stone-700">Contrasena</span>
                <input
                  type="password"
                  className="min-h-12 w-full rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3 text-base outline-none focus:border-rose-300 focus:bg-white"
                  value={loginPassword}
                  onChange={(event) => setLoginPassword(event.target.value)}
                  required
                />
              </label>

              {loginError ? <p className="text-sm font-medium text-rose-600">{loginError}</p> : null}

              <button
                type="submit"
                disabled={isLoggingIn}
                className="min-h-12 w-full rounded-2xl bg-gradient-to-r from-rose-500 to-violet-500 px-5 py-3 text-sm font-semibold text-white hover:from-rose-600 hover:to-violet-600 disabled:opacity-70"
              >
                {isLoggingIn ? "Entrando..." : "Entrar"}
              </button>
            </form>
          </section>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#fcfafb] text-slate-900">
      <div className="mx-auto flex min-h-screen w-full max-w-5xl flex-col px-4 pb-28 pt-4 sm:px-5 md:px-8 md:pb-12 md:pt-5">
        <section className="pt-2 sm:pt-4 md:pt-6">
          <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl md:text-5xl">
            Churris contratos
          </h1>
          <p className="mt-3 max-w-2xl text-base text-stone-500 sm:text-lg">
            Hola {currentUserName}. Aca creamos y seguimos nuestros acuerdos.
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
                  placeholder="Ej: contrato churrero"
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
                <span className="text-sm font-medium text-stone-700">Hora de inicio (opcional)</span>
                <input
                  type="time"
                  className="min-h-12 w-full rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3 text-base outline-none focus:border-rose-300 focus:bg-white"
                  value={startTime}
                  onChange={(event) => setStartTime(event.target.value)}
                />
              </label>

              <label className="space-y-2">
                <span className="text-sm font-medium text-stone-700">Fecha de finalizacion</span>
                <input
                  type="date"
                  className="min-h-12 w-full rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3 text-base outline-none focus:border-rose-300 focus:bg-white"
                  value={endDate}
                  onChange={(event) => setEndDate(event.target.value)}
                  required
                />
              </label>

              <label className="space-y-2">
                <span className="text-sm font-medium text-stone-700">
                  Hora de finalizacion (opcional)
                </span>
                <input
                  type="time"
                  className="min-h-12 w-full rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3 text-base outline-none focus:border-rose-300 focus:bg-white"
                  value={endTime}
                  onChange={(event) => setEndTime(event.target.value)}
                />
              </label>

              {dateError ? (
                <p className="text-sm font-medium text-rose-600 md:col-span-2">{dateError}</p>
              ) : null}

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
          {requestError ? (
            <div className="flex min-h-[240px] flex-col items-center justify-center text-center">
              <h2 className="text-xl font-semibold text-slate-900">Error de conexion</h2>
              <p className="mt-2 max-w-md text-sm leading-7 text-stone-500">{requestError}</p>
            </div>
          ) : isLoadingContracts ? (
            <div className="flex min-h-[240px] items-center justify-center text-stone-500">
              Cargando contratos...
            </div>
          ) : filteredContracts.length === 0 ? (
            <div className="flex min-h-[340px] flex-col items-center justify-center text-center sm:min-h-[420px]">
              <div className="flex h-20 w-20 items-center justify-center rounded-full bg-stone-50 text-4xl text-stone-300 sm:h-24 sm:w-24">
                ○
              </div>
              <h2 className="mt-6 text-2xl font-semibold tracking-tight text-slate-900 sm:mt-8 sm:text-3xl">
                No hay contratos
              </h2>
              <p className="mt-3 max-w-md text-base leading-7 text-stone-500 sm:text-lg sm:leading-8">
                Crea un contrato, por cierto intenta que sea super super cute🥰
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
                const endDateTime = getEndDateTime(contract);
                const isOpen = openContractId === contract.id;
                const startTimeLabel = formatHumanTime(contract.startTime);
                const endTimeLabel = formatHumanTime(contract.endTime);
                const canAccept =
                  currentUserName !== contract.createdByName && !contract.acceptedAt;
                const canDelete = currentUserName === contract.createdByName;

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
                            <span>Creado por: {contract.createdByName}</span>
                            <span>
                              Inicio: {formatHumanDate(contract.startDate)}
                              {startTimeLabel ? ` ${startTimeLabel}` : ""}
                            </span>
                            <span>
                              Fin: {endDateTime.toLocaleDateString("es-AR")}
                              {endTimeLabel ? ` ${endTimeLabel}` : ""}
                            </span>
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

                        <div className="mt-4 grid gap-2 text-sm text-stone-500 sm:grid-cols-2">
                          <p>Creado: {formatHumanDate(contract.createdAt)}</p>
                          <p>
                            Inicio: {formatHumanDate(contract.startDate)}
                            {startTimeLabel ? ` ${startTimeLabel}` : ""}
                          </p>
                          <p>
                            Fin: {endDateTime.toLocaleDateString("es-AR")}
                            {endTimeLabel ? ` ${endTimeLabel}` : ""}
                          </p>
                          <p>Autor: {contract.createdByName}</p>
                          <p>
                            Aceptado por:{" "}
                            {contract.acceptedByName
                              ? `${contract.acceptedByName} (${formatHumanDateTime(contract.acceptedAt ?? "")})`
                              : "0 churritos"}
                          </p>
                        </div>

                        {canAccept ? (
                          <button
                            type="button"
                            onClick={() => void handleAcceptContract(contract.id)}
                            className="mt-4 min-h-11 rounded-xl border border-violet-200 bg-violet-50 px-4 py-2 text-sm font-semibold text-violet-700"
                          >
                            Unirme / Aceptar contrato
                          </button>
                        ) : null}

                        {canDelete ? (
                          <button
                            type="button"
                            onClick={() => void handleDeleteContract(contract.id)}
                            className="mt-3 min-h-11 rounded-xl border border-rose-200 bg-rose-50 px-4 py-2 text-sm font-semibold text-rose-700"
                          >
                            Eliminar contrato
                          </button>
                        ) : null}
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
