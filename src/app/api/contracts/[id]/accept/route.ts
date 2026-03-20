import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUserName } from "@/lib/auth";
import { getMongoDb } from "@/lib/mongodb";

export async function PATCH(
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
    const contract = await collection.findOne({ id }, { projection: { _id: 0 } });

    if (!contract) {
      return NextResponse.json({ message: "Contrato no encontrado." }, { status: 404 });
    }

    if (contract.createdByName === userName) {
      return NextResponse.json(
        { message: "El creador no puede aceptar su propio contrato." },
        { status: 400 },
      );
    }

    if (contract.acceptedAt) {
      return NextResponse.json({ contract });
    }

    const acceptedAt = new Date().toISOString();

    await collection.updateOne(
      { id },
      {
        $set: {
          acceptedByName: userName,
          acceptedAt,
          updatedAt: acceptedAt,
        },
      },
    );

    const updatedContract = await collection.findOne({ id }, { projection: { _id: 0, updatedAt: 0 } });

    return NextResponse.json({ contract: updatedContract });
  } catch {
    return NextResponse.json(
      { message: "No se pudo aceptar el contrato en MongoDB." },
      { status: 500 },
    );
  }
}
