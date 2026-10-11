import type { FurnitureSet } from "../../../theme/themes";
import * as City from "./city";
import * as Country from "./countryside";
import * as Forest from "./forest";
import * as Hideout from "./hideout";
import * as Rain from "./rain";
import type { ThemeFurniture } from "./types";

/**
 * テーマごとの家具のセット。家具のID（bed, desk …）ごとに、そのテーマでの見た目を決める。
 * 書いていない家具は Room.tsx にある元の（森の）家具を使う
 */
export const FURNITURE_SETS: Partial<Record<FurnitureSet, ThemeFurniture>> = {
  natural: {
    pieces: {
      bed: ({ children }) => <Forest.ForestBed>{children}</Forest.ForestBed>,
      chair: ({ children }) => <Forest.ForestChair>{children}</Forest.ForestChair>,
      sofa: () => <Forest.ForestSofa />,
    },
    keepNaturalDecor: true,
  },
  hideout: {
    pieces: {
      desk: ({ glow }) => <Hideout.HideoutDesk glow={glow} />,
      chair: ({ children }) => <Hideout.GamingChair>{children}</Hideout.GamingChair>,
      bed: ({ children }) => <Hideout.HideoutBed>{children}</Hideout.HideoutBed>,
      sideTable: ({ glow }) => <Hideout.HideoutNightstand glow={glow} />,
      rug: () => <Hideout.HideoutRug />,
      sofa: () => <Hideout.HideoutSofa />,
      bookshelf: () => <Hideout.HideoutShelf />,
      lowTable: () => <Hideout.HideoutCoffeeTable />,
      floorLamp: ({ glow }) => <Hideout.ArcLamp glow={glow} />,
      guitar: () => <Hideout.AcousticGuitar />,
    },
    decor: () => <Hideout.HideoutDecor />,
    seat: { pose: "desk", headphones: true, position: [0, 0.5, 0.02] },
  },
  rain: {
    pieces: {
      desk: ({ glow }) => <Rain.RainDesk glow={glow} />,
      chair: ({ children }) => <Rain.RainChair>{children}</Rain.RainChair>,
      bed: ({ children }) => <Rain.RainBed>{children}</Rain.RainBed>,
      sideTable: ({ glow }) => <Rain.RainNightstand glow={glow} />,
      rug: () => <Rain.RainRug />,
      sofa: () => <Rain.RainSofa />,
      bookshelf: () => <Rain.RainShelf />,
      lowTable: () => <Rain.RainTeaTable />,
      floorLamp: ({ glow }) => <Rain.TripodLamp glow={glow} />,
      guitar: () => <Hideout.AcousticGuitar />,
    },
    decor: () => <Rain.RainDecor />,
    keepNaturalDecor: true,
  },
  countryside: {
    pieces: {
      desk: ({ glow }) => <Country.LowDesk glow={glow} />,
      chair: ({ children }) => <Country.Zaisu>{children}</Country.Zaisu>,
      bed: ({ children }) => <Country.Futon>{children}</Country.Futon>,
      sideTable: ({ glow }) => <Country.Andon glow={glow} />,
      rug: () => <Country.TatamiMats />,
      sofa: () => <Country.Bench />,
      bookshelf: () => <Country.Tansu />,
      lowTable: () => <Country.Chabudai />,
      floorLamp: ({ glow }) => <Country.PaperLantern glow={glow} />,
      guitar: () => <Hideout.AcousticGuitar />,
    },
    decor: () => <Country.CountryDecor />,
    seat: { pose: "reading", position: [0, 0.07, 0.05] },
    bedSpot: [1.45, 0.17, -2.38],
  },
  city: {
    pieces: {
      desk: ({ glow }) => <City.CityDesk glow={glow} />,
      chair: ({ children }) => <City.MeshChair>{children}</City.MeshChair>,
      bed: ({ children }) => <City.CityBed>{children}</City.CityBed>,
      sideTable: ({ glow }) => <City.CityNightstand glow={glow} />,
      rug: () => <City.CityRug />,
      sofa: () => <City.CitySofa />,
      bookshelf: () => <City.CityShelf />,
      lowTable: () => <City.MarbleTable />,
      floorLamp: ({ glow }) => <City.LedFloorBar glow={glow} />,
      guitar: () => <City.ElectricGuitar />,
    },
    decor: () => <City.CityDecor />,
    seat: { pose: "desk", position: [0, 0.49, 0.02] },
  },
};
