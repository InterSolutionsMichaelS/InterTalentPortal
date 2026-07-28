'use client';

import { useEffect, useState } from 'react';
import { signIn, useSession } from 'next-auth/react';
import { useSearchParams } from 'next/navigation';

type AcknowledgementResult = {
    Success?: boolean;
    Result?: 'Acknowledged' | 'AlreadyOwned' | 'InvalidToken' | 'Error';
    OwnerName?: string;
    OwnerEmail?: string;
    OwnedDateTimeUTC?: string;
    ErrorMessage?: string;
};

export default function AcknowledgePage() {
    const { status } = useSession();
    const searchParams = useSearchParams();

    const requestId = searchParams.get('requestId');
    const token = searchParams.get('token');

    const [loading, setLoading] = useState(true);
    const [result, setResult] = useState<AcknowledgementResult | null>(null);

    useEffect(() => {
        async function authenticate() {
            if (status !== 'unauthenticated') {
                return;
            }

            const result = await signIn('azure-ad', {
                callbackUrl: window.location.href,
                redirect: false,
            });

            console.log(result);
        }

        authenticate();
    }, [status]);

    useEffect(() => {
        if (status !== 'authenticated') return;

        if (!requestId || !token) {
            setResult({
                Result: 'Error',
                ErrorMessage: 'The acknowledgement link is missing required information.',
            });

            setLoading(false);
            return;
        }

        async function acknowledge() {
            try {
                const response = await fetch('/api/internal/acknowledge', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        requestId,
                        acknowledgementToken: token,
                    }),
                });

                const data = await response.json();

                console.log(data);

                setResult(data);
            } catch (error) {
                console.error(error);

                setResult({
                    Result: 'Error',
                    ErrorMessage: 'Unable to contact the server.',
                });
            } finally {
                setLoading(false);
            }
        }

        acknowledge();
    }, [status, requestId, token]);

    if (status === 'loading' || loading) {
        return (
            <PageLayout>
                <ResultCard>
                    <div style={{ textAlign: 'center', padding: '50px 30px' }}>
                        <h2
                            style={{
                                margin: 0,
                                color: '#022949',
                                fontSize: '30px',
                                fontWeight: 700,
                            }}
                        >
                            Recording your acknowledgement...
                        </h2>

                        <p
                            style={{
                                marginTop: '14px',
                                marginBottom: 0,
                                color: '#5f6b76',
                                fontSize: '18px',
                            }}
                        >
                            Please wait while we assign the request.
                        </p>
                    </div>
                </ResultCard>
            </PageLayout>
        );
    }

    if (result?.Result === 'Acknowledged') {
        return (
            <PageLayout>
                <ResultCard>
                    <div
                        style={{
                            padding: '48px 42px',
                            textAlign: 'center',
                        }}
                    >
                        <div
                            style={{
                                width: '78px',
                                height: '78px',
                                margin: '0 auto 22px',
                                borderRadius: '50%',
                                background: '#e8f7ec',
                                color: '#218739',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: '46px',
                                fontWeight: 700,
                            }}
                        >
                            ✓
                        </div>

                        <h1
                            style={{
                                margin: 0,
                                color: '#218739',
                                fontSize: '38px',
                                fontWeight: 750,
                            }}
                        >
                            Request Accepted
                        </h1>

                        <p
                            style={{
                                marginTop: '14px',
                                marginBottom: '32px',
                                color: '#334155',
                                fontSize: '20px',
                                lineHeight: 1.6,
                            }}
                        >
                            This request has been assigned to you.
                        </p>

                        <InformationPanel>
                            <InformationRow
                                label="Owner"
                                value={result.OwnerName ?? 'Not available'}
                            />

                            <InformationRow
                                label="Accepted"
                                value={formatDate(result.OwnedDateTimeUTC)}
                                showBorder={false}
                            />
                        </InformationPanel>

                        <p
                            style={{
                                marginTop: '32px',
                                marginBottom: 0,
                                color: '#68737d',
                                fontSize: '17px',
                            }}
                        >
                            You may now close this window.
                        </p>
                    </div>
                </ResultCard>
            </PageLayout>
        );
    }

    if (result?.Result === 'AlreadyOwned') {
        return (
            <PageLayout>
                <ResultCard>
                    <div
                        style={{
                            padding: '48px 42px',
                            textAlign: 'center',
                        }}
                    >
                        <div
                            style={{
                                width: '78px',
                                height: '78px',
                                margin: '0 auto 22px',
                                borderRadius: '50%',
                                background: '#fff6d8',
                                color: '#b47b00',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: '42px',
                                fontWeight: 700,
                            }}
                        >
                            !
                        </div>

                        <h1
                            style={{
                                margin: 0,
                                color: '#b47b00',
                                fontSize: '38px',
                                fontWeight: 750,
                            }}
                        >
                            Already Accepted
                        </h1>

                        <p
                            style={{
                                marginTop: '14px',
                                marginBottom: '32px',
                                color: '#334155',
                                fontSize: '20px',
                                lineHeight: 1.6,
                            }}
                        >
                            This request has already been accepted.
                        </p>

                        <InformationPanel>
                            <InformationRow
                                label="Accepted By"
                                value={result.OwnerName ?? 'Not available'}
                            />

                            <InformationRow
                                label="Accepted"
                                value={formatDate(result.OwnedDateTimeUTC)}
                                showBorder={false}
                            />
                        </InformationPanel>

                        <p
                            style={{
                                marginTop: '32px',
                                marginBottom: 0,
                                color: '#68737d',
                                fontSize: '17px',
                            }}
                        >
                            No further action is required.
                        </p>
                    </div>
                </ResultCard>
            </PageLayout>
        );
    }

    if (result?.Result === 'InvalidToken') {
        return (
            <PageLayout>
                <ResultCard>
                    <div
                        style={{
                            padding: '48px 42px',
                            textAlign: 'center',
                        }}
                    >
                        <div
                            style={{
                                width: '78px',
                                height: '78px',
                                margin: '0 auto 22px',
                                borderRadius: '50%',
                                background: '#fdecec',
                                color: '#b42318',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: '42px',
                                fontWeight: 700,
                            }}
                        >
                            ×
                        </div>

                        <h1
                            style={{
                                margin: 0,
                                color: '#b42318',
                                fontSize: '38px',
                                fontWeight: 750,
                            }}
                        >
                            Invalid Link
                        </h1>

                        <p
                            style={{
                                marginTop: '14px',
                                marginBottom: 0,
                                color: '#334155',
                                fontSize: '20px',
                                lineHeight: 1.6,
                            }}
                        >
                            This acknowledgement link is no longer valid.
                        </p>
                    </div>
                </ResultCard>
            </PageLayout>
        );
    }

    return (
        <PageLayout>
            <ResultCard>
                <div
                    style={{
                        padding: '48px 42px',
                        textAlign: 'center',
                    }}
                >
                    <div
                        style={{
                            width: '78px',
                            height: '78px',
                            margin: '0 auto 22px',
                            borderRadius: '50%',
                            background: '#fdecec',
                            color: '#b42318',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '42px',
                            fontWeight: 700,
                        }}
                    >
                        !
                    </div>

                    <h1
                        style={{
                            margin: 0,
                            color: '#b42318',
                            fontSize: '38px',
                            fontWeight: 750,
                        }}
                    >
                        Unexpected Error
                    </h1>

                    <p
                        style={{
                            marginTop: '14px',
                            marginBottom: 0,
                            color: '#334155',
                            fontSize: '20px',
                            lineHeight: 1.6,
                        }}
                    >
                        {result?.ErrorMessage ?? 'Something went wrong.'}
                    </p>
                </div>
            </ResultCard>
        </PageLayout>
    );
}

function PageLayout({ children }: { children: React.ReactNode }) {
    return (
        <main
            style={{
                minHeight: '100vh',
                background: '#022949',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                padding: '40px 20px',
                fontFamily: 'Arial, Helvetica, sans-serif',
            }}
        >
            <div
                style={{
                    width: '100%',
                    maxWidth: '760px',
                }}
            >
                <header
                    style={{
                        textAlign: 'center',
                        marginBottom: '24px',
                    }}
                >
                    <img
                        src="/intersolutions.logo.jpg.jpg"
                        alt="InterSolutions"
                        style={{
                            display: 'block',
                            width: '100%',
                            maxWidth: '320px',
                            height: 'auto',
                            margin: '0 auto 22px',
                            objectFit: 'contain',
                        }}
                    />

                    <h1
                        style={{
                            margin: 0,
                            color: '#ffffff',
                            fontSize: '34px',
                            fontWeight: 700,
                            letterSpacing: '0.2px',
                        }}
                    >
                        InterTalent Lead Acknowledgement
                    </h1>
                </header>

                {children}
            </div>
        </main>
    );
}

function ResultCard({ children }: { children: React.ReactNode }) {
    return (
        <section
            style={{
                background: '#ffffff',
                borderRadius: '14px',
                overflow: 'hidden',
                boxShadow: '0 18px 45px rgba(0, 0, 0, 0.28)',
                border: '1px solid rgba(255, 255, 255, 0.22)',
            }}
        >
            {children}
        </section>
    );
}

function InformationPanel({ children }: { children: React.ReactNode }) {
    return (
        <div
            style={{
                background: '#f5f7f9',
                border: '1px solid #d8dee4',
                borderRadius: '10px',
                padding: '0 26px',
                textAlign: 'left',
            }}
        >
            {children}
        </div>
    );
}

function InformationRow({
    label,
    value,
    showBorder = true,
}: {
    label: string;
    value: string;
    showBorder?: boolean;
}) {
    return (
        <div
            style={{
                padding: '22px 0',
                borderBottom: showBorder ? '1px solid #d8dee4' : 'none',
            }}
        >
            <div
                style={{
                    color: '#022949',
                    fontSize: '17px',
                    fontWeight: 700,
                    marginBottom: '6px',
                }}
            >
                {label}
            </div>

            <div
                style={{
                    color: '#1f2933',
                    fontSize: '22px',
                    lineHeight: 1.4,
                }}
            >
                {value}
            </div>
        </div>
    );
}

function formatDate(value?: string) {
    if (!value) {
        return 'Not available';
    }

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
        return value;
    }

    return date.toLocaleString();
}