import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUserName } from "@/lib/auth";
import { getMongoDb } from "@/lib/mongodb";

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const userName = getAuthenticatedUserName(request);

    if (!userName) {
      return NextResponse.json({ message: "No autenticado." }, { status: 401 });
    }

    const { id } = await context.params;

    if (!id) {
      return NextResponse.json({ message: "ID de contrato invalido." }, { status: 400 });
    }

    const db = await getMongoDb();
    const collection = db.collection("contratos");
    const contract = await collection.findOne({ id }, { projection: { _id: 0, createdByName: 1 } });

    if (!contract) {
      return NextResponse.json({ message: "Contrato no encontrado." }, { status: 404 });
    }

    if (contract.createdByName !== userName) {
      return NextResponse.json(
        { message: "Solo el autor puede eliminar este contrato." },
        { status: 403 },
      );
    }

    await collection.deleteOne({ id });

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json(
      { message: "No se pudo eliminar el contrato en MongoDB." },
      { status: 500 },
    );
  }
}
