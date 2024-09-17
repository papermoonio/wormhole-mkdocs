import { ChainDetails, ChainType } from './config';

export function chainCard(
  dc: ChainDetails,
  chainType: ChainType,
  pathToRoot: string
): string {
  const { name } = dc;

  let environment = chainType.toLowerCase();
  if (environment === '') environment = name;

  let title = dc.extraDetails?.title;
  if (title === undefined) title = name;

  const icon = `/images/build/start-building/supported-networks/${name}.webp`;
  const link = `/build/start-building/supported-networks/${environment}/${name}/`;

  return `
    <td style="vertical-align: top; text-align: center;">
      <a href="${link}">
        <strong>${title}</strong><br>
        <img src="${icon}" alt="${title}" style="width:90px; height:auto;">
      </a>
    </td>`;
}
