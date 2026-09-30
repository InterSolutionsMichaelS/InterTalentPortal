import { Suspense } from "react";
import AcknowledgeClient from "./AcknowledgeClient";

export default function Page() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <AcknowledgeClient />
    </Suspense>
  );
}