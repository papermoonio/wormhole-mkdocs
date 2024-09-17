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

  const icon = `/images/build/start-building/supported-networks/${name}.webp`;
  const link = `/build/start-building/supported-networks/${environment}#${name}`;

  return `
<div class="faucet" markdown>

<strong>${title}</strong>
<br><br>
<a href="${link}"><img class="no-lightbox" src="${icon}" alt="${title}" style="width:90px; height:auto;"></a>

</div>`;
}
