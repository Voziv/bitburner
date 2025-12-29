import { NS } from '@ns';

export async function main(ns: NS): Promise<void> {
    ns.disableLog('ALL');

    ns.singularity.travelToCity(ns.enums.CityName.Aevum)
    ns.singularity.travelToCity(ns.enums.CityName.Volhaven)
    ns.singularity.travelToCity(ns.enums.CityName.Ishima)
    ns.singularity.travelToCity(ns.enums.CityName.NewTokyo)
    ns.singularity.travelToCity(ns.enums.CityName.Chongqing)
    ns.singularity.travelToCity(ns.enums.CityName.Sector12)
}