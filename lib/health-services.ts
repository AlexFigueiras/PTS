export interface HealthService {
  id: string;
  name: string;
  type: 'UBS' | 'ESF' | 'CRAS' | 'CAPS' | 'SAPRU' | 'OUTRO';
  address: string;
  lat: number;
  lon: number;
  phone?: string;
}

export const PUBLIC_SERVICES: HealthService[] = [
  { id: 'ubs-centro', name: 'UBS Centro', type: 'UBS', address: 'Rua Pedro de Oliveira Costa, 156, Centro', lat: -22.1225, lon: -51.3888 },
  { id: 'ubs-cohab', name: 'UBS Cohab', type: 'UBS', address: 'Avenida Ana Jacinta, 1245, Jardim Eldorado', lat: -22.1135, lon: -51.4242 },
  { id: 'ubs-ana-jacinta', name: 'UBS Ana Jacinta', type: 'UBS', address: 'Avenida Oswaldo da Silva, Conjunto Ana Jacinta', lat: -22.1633, lon: -51.4333 },
  { id: 'ubs-guanabara', name: 'UBS Guanabara', type: 'UBS', address: 'Rua Alberto Marochio, 93, Jardim Guanabara', lat: -22.1055, lon: -51.3788 },
  { id: 'ubs-vila-real', name: 'UBS Vila Real', type: 'UBS', address: 'Avenida Comendador Alberto Bonfiglioli, 2610, Jardim Vila Real', lat: -22.1388, lon: -51.4022 },
  { id: 'ubs-brasil-novo', name: 'UBS Brasil Novo', type: 'UBS', address: 'Rua Júlio Aranha, 1210, Brasil Novo', lat: -22.0888, lon: -51.3655 },
  { id: 'ubs-cedral', name: 'UBS Parque Cedral', type: 'UBS', address: 'Rua Luiz André, 426, Jardim Monte Alto', lat: -22.1455, lon: -51.4222 },
  { id: 'ubs-santana', name: 'UBS Santana', type: 'UBS', address: 'Rua Alberto Artoni, 190, Jardim Santana', lat: -22.1122, lon: -51.3955 },
  { id: 'esf-marcondes', name: 'ESF Vila Marcondes', type: 'ESF', address: 'Rua Bahia, 454, Vila Marcondes', lat: -22.1155, lon: -51.3822 },
  { id: 'esf-prudente', name: 'ESF Nova Prudente', type: 'ESF', address: 'Rua Galdino de Souza, 289, Vila Maria', lat: -22.1088, lon: -51.3922 },
  { id: 'esf-humberto', name: 'ESF Humberto Salvador', type: 'ESF', address: 'Rua Gilberto Janota Mele, 431, Humberto Salvador', lat: -22.0855, lon: -51.3588 },
  { id: 'esf-alvorada', name: 'ESF Alvorada', type: 'ESF', address: 'Rua Milton José Bissoli, 380, Parque Alvorada', lat: -22.1322, lon: -51.4188 },
  { id: 'esf-leonor', name: 'ESF Leonor', type: 'ESF', address: 'Rua José Quirino da Silva, 206, Jardim Leonor', lat: -22.1255, lon: -51.4088 },
  { id: 'cras-ceu', name: 'CRAS Praça CEU', type: 'CRAS', address: 'Avenida Tancredo Neves, 2150, Jardim Itatiaia', lat: -22.1588, lon: -51.4255 },
  { id: 'cras-alexandrina', name: 'CRAS Alexandrina', type: 'CRAS', address: 'Rua João Marques Nogueira, Parque Alexandrina', lat: -22.1211, lon: -51.393 },
  { id: 'cras-nochete', name: 'CRAS Nochete / Morada do Sol', type: 'CRAS', address: 'Rua Amélia Álvares Gomes, 10, Morada do Sol', lat: -22.1211, lon: -51.393 },
  { id: 'cras-augusto', name: 'CRAS Augusto de Paula', type: 'CRAS', address: 'Rua Gilberto Janota Mele, 539, Humberto Salvador', lat: -22.0866, lon: -51.3599 },
  { id: 'cras-cambuci', name: 'CRAS Cambuci', type: 'CRAS', address: 'Rua Ricardo Tonzi, 35, Jardim Cambuci', lat: -22.151, lon: -51.3751 },
  { id: 'caps-ad', name: 'CAPS AD III', type: 'CAPS', address: 'Rua dos Ipês Roxos, 490, CECAP', lat: -22.1112, lon: -51.4294 },
  { id: 'caps-maracana', name: 'CAPS II Maracanã', type: 'CAPS', address: 'Rua Jardim Maracanã', lat: -22.1288, lon: -51.3988 },
  { id: 'sapru', name: 'SAPRU', type: 'SAPRU', address: 'Presidente Prudente', lat: -22.12, lon: -51.38 },
];

export function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
