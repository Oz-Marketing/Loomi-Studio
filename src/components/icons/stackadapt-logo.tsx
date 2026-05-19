import type { SVGProps } from 'react';

const LOGO_URL =
  'https://loomistorage.sfo3.digitaloceanspaces.com/media/_admin/8a91bb5d5176413b9ff04d8f129d6bd5/stackadapt_logo.png';

/**
 * StackAdapt brand logo, used for the Tools → OTT sidebar dropdown.
 * Types match the sidebar's `IconComponent` (SVG-props) shape so it
 * can slot in next to Heroicons. Only `className` is used in practice.
 */
export function StackAdaptLogoIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <img
      src={LOGO_URL}
      alt=""
      aria-hidden="true"
      className={`${typeof props.className === 'string' ? props.className : ''} object-contain`}
    />
  );
}
