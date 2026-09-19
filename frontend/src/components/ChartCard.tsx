import { ReactNode } from "react";

type ChartCardProps = {
  title: string;
  subtitle: string;
  right?: ReactNode;
  wide?: boolean;
  children: ReactNode;
};

export default function ChartCard({ title, subtitle, right, wide, children }: ChartCardProps) {
    return (
        <section className={wide ? "card wide" : "card"}>
            <div className="card-h">
                <div>
                    <h2>{title}</h2>
                    <p>{subtitle}</p>
                </div>
                {right}
            </div>
            {children}
        </section>
    );
}