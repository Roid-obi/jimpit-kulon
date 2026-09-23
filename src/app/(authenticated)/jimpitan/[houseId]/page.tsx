export default function HouseDetailPage({
  params,
}: {
  params: { houseId: string };
}) {
  return (
    <div className="flex flex-col p-4">
      <h1 className="text-2xl font-bold mb-4">
        Detail Rumah: {params.houseId}
      </h1>
      {/* TODO: Add house details, payment recording, and payment history */}
    </div>
  );
}
