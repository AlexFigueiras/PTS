import { describe, it, expect } from 'vitest';
import {
  NETWORK_COMPONENTS,
  NEED_TYPES,
  COMPONENT_NEED_MAP,
  SIGNAL_STATUS_LABELS,
  COMPONENT_SPHERES,
  getComponentsForNeed,
  getSphereForComponent,
} from './network-catalog';
import { SIGNAL_STATUSES } from './signal';

describe('network-catalog (domínio puro)', () => {
  const componentIds = new Set<string>(NETWORK_COMPONENTS.map((c) => c.id));
  const needTypeIds = new Set<string>(NEED_TYPES.map((n) => n.id));

  describe('Integridade dos ids', () => {
    it('não há ids duplicados em NETWORK_COMPONENTS', () => {
      expect(componentIds.size).toBe(NETWORK_COMPONENTS.length);
    });

    it('não há ids duplicados em NEED_TYPES', () => {
      expect(needTypeIds.size).toBe(NEED_TYPES.length);
    });

    it('toda sphere de componente é válida', () => {
      for (const c of NETWORK_COMPONENTS) {
        expect(COMPONENT_SPHERES).toContain(c.sphere);
      }
    });
  });

  describe('Exaustividade do COMPONENT_NEED_MAP', () => {
    it('todo needTypeId mapeado existe em NEED_TYPES', () => {
      for (const needId of Object.keys(COMPONENT_NEED_MAP)) {
        expect(needTypeIds.has(needId)).toBe(true);
      }
    });

    it('toda necessidade tem ao menos um componente mapeado', () => {
      for (const need of NEED_TYPES) {
        expect(COMPONENT_NEED_MAP[need.id].length).toBeGreaterThan(0);
      }
    });

    it('todo componentId referenciado existe em NETWORK_COMPONENTS', () => {
      for (const components of Object.values(COMPONENT_NEED_MAP)) {
        for (const componentId of components) {
          expect(componentIds.has(componentId)).toBe(true);
        }
      }
    });
  });

  describe('getComponentsForNeed', () => {
    it('retorna array não-vazio para cada necessidade catalogada', () => {
      for (const need of NEED_TYPES) {
        expect(getComponentsForNeed(need.id).length).toBeGreaterThan(0);
      }
    });

    it('retorna array vazio para necessidade desconhecida', () => {
      expect(getComponentsForNeed('inexistente')).toEqual([]);
    });
  });

  describe('getSphereForComponent', () => {
    it('retorna sphere válida para cada componente', () => {
      for (const c of NETWORK_COMPONENTS) {
        expect(getSphereForComponent(c.id)).toBe(c.sphere);
      }
    });

    it('retorna undefined para componente desconhecido', () => {
      expect(getSphereForComponent('inexistente')).toBeUndefined();
    });
  });

  describe('SIGNAL_STATUS_LABELS', () => {
    it('cobre exatamente todos os SIGNAL_STATUSES', () => {
      const labelKeys = Object.keys(SIGNAL_STATUS_LABELS);
      expect(labelKeys).toHaveLength(SIGNAL_STATUSES.length);
      for (const status of SIGNAL_STATUSES) {
        expect(SIGNAL_STATUS_LABELS[status]).toBeTruthy();
      }
    });
  });
});
