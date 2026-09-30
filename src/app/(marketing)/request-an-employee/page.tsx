import AdsPanel from '@/components/AdsPanel/AdsPanel';
import RequestEmployeeForm from './RequestEmployeeForm';


export const dynamic = 'force-dynamic';

export default function RequestAnEmployeePage() {
  return (
    <div className="min-h-screen bg-gray-50">

      {/* HERO / BACKGROUND IMAGE */}
      <section
        className="relative h-[380px] bg-cover bg-[center]"
        style={{
          backgroundImage: 'url(/banner-employers.jpg)',
        }}
      >
        {/* Dark overlay */}
        <div className="absolute inset-0 bg-black/60" />

        {/* Hero wording */}
        <div className="container relative z-10 mx-auto flex h-full items-center justify-center px-4">
          <div className="text-center text-white">
            <h1 className="text-4xl font-bold uppercase md:text-5xl">
              Looking for Talent?
            </h1>

            <div className="mx-auto my-5 h-[2px] w-56 bg-white" />

            <p className="text-lg font-medium md:text-xl">
              We&apos;re on it! We just need a little more information
              to match you with the best available associate.
            </p>
          </div>
        </div>
      </section>


      {/* REQUEST FORM AREA */}
      <section className="container mx-auto px-4 py-12">
        <div className="flex flex-col gap-10 lg:flex-row">

          {/* LEFT */}
          <main className="min-w-0 flex-1">

            {/* BLUE REQUEST BANNER */}
            <div className="flex min-h-[150px] items-center justify-center bg-[#002f56] px-8 py-6">
                <div className="text-center">
                <h2 className="text-3xl font-bold text-white">
                    Request an Employee
                </h2>

                <p className="mx-auto mt-3 max-w-3xl leading-relaxed text-white">
                    Are you looking for an outstanding new employee?
                    Please fill out our form below and InterSolutions&apos;
                    knowledgeable staffing experts will contact you to
                    further discuss your needs.
                </p>
                </div>
            </div>

            <RequestEmployeeForm />

            </main>


          {/* RIGHT - ADS */}
          <aside className="shrink-0 lg:w-72">
            <div className="sticky top-6">
              <AdsPanel targetAccount="base" />
            </div>
          </aside>

        </div>
      </section>

    </div>
  );
}