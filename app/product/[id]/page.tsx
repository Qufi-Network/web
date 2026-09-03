import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { PRODUCTS } from '../../../components/site/catalogue';
import { ProductPage } from '../../../components/site/ProductPage';
import { journeyFor } from '../../../experience/lifecycle/journeys/index';

export function generateStaticParams() {
  return PRODUCTS.map((product) => ({ id: product.id }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const product = PRODUCTS.find((entry) => entry.id === id);
  if (!product) return {};
  return { title: product.name, description: product.lede };
}

/**
 * One product.
 *
 * The walk if there is one, the writing if there is not, and the writing at the
 * far end either way. The document underneath is the same content in the same
 * order, always served — it is what a machine without a GPU gets, and what a
 * crawler reads.
 */
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const product = PRODUCTS.find((entry) => entry.id === id);
  if (!product) notFound();
  const journey = journeyFor(id);

  return (
    <>
      <ProductPage id={id} />

      <main className="document">
        <h1>{product.name}</h1>
        <p className="lede">{product.lede}</p>
        {product.body.map((paragraph) => (
          <p key={paragraph.slice(0, 32)}>{paragraph}</p>
        ))}

        {journey ? (
          <>
            <h2>Step by step</h2>
            {journey.stages.map((stage) => (
              <section key={stage.id}>
                <h2>
                  {stage.index} · {stage.title}
                </h2>
                <p>{stage.body}</p>
              </section>
            ))}
          </>
        ) : null}

        <h2>What it is made of</h2>
        <dl>
          {product.parts.map(([term, detail]) => (
            <div key={term}>
              <dt>{term}</dt>
              <dd>{detail}</dd>
            </div>
          ))}
        </dl>

        <h2>Status</h2>
        <p>{product.status}</p>
      </main>
    </>
  );
}
