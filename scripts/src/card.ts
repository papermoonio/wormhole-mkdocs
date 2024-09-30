import { ChainDetails, ChainType } from './config';

export function chainCard(
  dc: ChainDetails,
  chainType: ChainType,
): string {
  const { name } = dc;

  let environment = chainType.toLowerCase();
  if (environment === '') environment = name;

  let title = dc.extraDetails?.title;
  if (title === undefined) title = name;

  const icon = `/docs/images/build/start-building/supported-networks/${name}.webp`;
  const link = `/docs/build/start-building/supported-networks/${environment}#${name}`;

  return `
<div class="chains-list" markdown>

<strong>${title}</strong>
<br><br>
<a href="${link}"><img class="no-lightbox" src="${icon}" alt="${title}" style="max-width:90px; max-height:90px;"></a>

</div>`;
}
