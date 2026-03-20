import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUserName } from "@/lib/auth";
import { getMongoDb } from "@/lib/mongodb";

type ContractDocument = {
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
  updatedAt: string;
};

function isValidContractPayload(payload: unknown): payload is Omit<ContractDocument, "updatedAt"> {
  if (!payload || typeof payload !== "object") {
    return false;
  }

  const record = payload as Record<string, unknown>;

  const requiredStringFields = ["id", "title", "details", "startDate", "endDate", "createdAt"];

  const hasRequiredFields = requiredStringFields.every(
    (field) => typeof record[field] === "string" && record[field] !== "",
  );

  const hasValidOptionalTimes =
    (record.startTime === undefined || typeof record.startTime === "string") &&
    (record.endTime === undefined || typeof record.endTime === "string");

  return hasRequiredFields && hasValidOptionalTimes;
}

export async function GET(request: NextRequest) {
  try {
    const userName = getAuthenticatedUserName(request);

    if (!userName) {
      return NextResponse.json({ message: "No autenticado." }, { status: 401 });
    }

    const db = await getMongoDb();
    const contracts = await db
      .collection<ContractDocument>("contratos")
      .find({})
      .sort({ createdAt: -1 })
      .project({ _id: 0, updatedAt: 0 })
      .toArray();

    return NextResponse.json({ contracts });
  } catch {
    return NextResponse.json(
      { message: "No se pudieron cargar los contratos desde MongoDB." },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const userName = getAuthenticatedUserName(request);

    if (!userName) {
      return NextResponse.json({ message: "No autenticado." }, { status: 401 });
    }

    const body = (await request.json()) as unknown;

    if (!isValidContractPayload(body)) {
      return NextResponse.json({ message: "Payload de contrato invalido." }, { status: 400 });
    }

    const db = await getMongoDb();
    const collection = db.collection<ContractDocument>("contratos");

    const document: ContractDocument = {
      ...body,
      createdByName: userName,
      updatedAt: new Date().toISOString(),
    };

    await collection.updateOne({ id: document.id }, { $set: document }, { upsert: true });

    return NextResponse.json(
      {
        contract: {
          id: document.id,
          title: document.title,
          details: document.details,
          startDate: document.startDate,
          startTime: document.startTime,
          endDate: document.endDate,
          endTime: document.endTime,
          createdAt: document.createdAt,
          createdByName: document.createdByName,
          acceptedByName: document.acceptedByName,
          acceptedAt: document.acceptedAt,
        },
      },
      { status: 201 },
    );
  } catch {
    return NextResponse.json(
      { message: "No se pudo guardar el contrato en MongoDB." },
      { status: 500 },
    );
  }
}
