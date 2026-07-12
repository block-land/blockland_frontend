"use client";

import { Button } from "@/components/ui/button";
import { withCustomButton } from "@/components/custom/button_custom";
import { useDialogStore } from "@/store/useDialogStore";
import VideoPlayer from "@/components/custom/video-player";
import {
  IconBox,
  IconDatabase,
  IconExchange,
  IconGrid,
  IconPlay,
} from "../lib/icon";
import { MdOutlineCheckCircleOutline } from "react-icons/md";
import { RiCheckboxBlankCircleFill } from "react-icons/ri";

const ButtonCustom = withCustomButton("button");

export default function Home() {
  const openDialog = useDialogStore((state) => state.openDialog);

  const handleWatchVision = () => {
    const videoJsOptions = {
      autoplay: true,
      controls: true,
      responsive: true,
      fluid: true,
      sources: [
        {
          src: "https://pub-435ea7c908ea4035b5643ba33e5eef48.r2.dev/blockland/vision.webm",
          type: "video/webm",
        },
      ],
    };

    openDialog("Watch Vision", <VideoPlayer options={videoJsOptions} />);
  };

  return (
    <>
      <section className="relative w-full h-screen overflow-hidden">
        <div className="absolute inset-0 w-full h-full z-0">
          <div className="w-full h-full bg-[url(/img/hero-1.png)] grayscale-50 bg-cover bg-bottom-right" />
        </div>
        <div className="bottom-0 left-0 right-0 bg-linear-to-t from-black to-transparent absolute h-[200px] z-10" />

        {/* Hero Content */}
        <div className="absolute inset-0 flex flex-col items-center justify-center px-6 z-20 top-0">
          <div className="container space-y-8">
            <h1 className="max-w-lg text-4xl tracking-tight sm:text-6xl text-white">
              The world first{" "}
              <span className="text-primary">coordinate economy</span>
            </h1>
            <p className="max-w-[22rem] text-lg">
              Own, trade, and build on Coordinate Units that represent
              real-world locations.
            </p>
            <div className="flex gap-4">
              <ButtonCustom>Explore the map</ButtonCustom>
              <ButtonCustom variant="outline" onClick={handleWatchVision}>
                Watch Vision
              </ButtonCustom>
            </div>

            <div className="flex flex-col md:flex-row justify-between gap-4 items-end">
              <div className="space-y-2">
                <p>Built On</p>
                <img
                  src="/img/solana.svg"
                  className="w-[150px] grayscale-100"
                  alt=""
                />
              </div>
              <div>
                <div className="bg-black/50 border-l-2 backdrop-blur-md border-primary p-4">
                  <h2>USA Genesis</h2>
                  <p>Starting with the united states</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
      <section className="py-20 container mx-auto grid grid-cols-4 divide-x">
        <div>
          <h4 className="text-3xl !text-primary">1 Country</h4>
          <p>USA Genesis</p>
        </div>
        <div className="pl-10">
          <h4 className="text-3xl !text-primary">1 Billion</h4>
          <p>Coordinate Units, Total Supply</p>
        </div>
        <div className="pl-10">
          <h4 className="text-3xl !text-primary">23,751</h4>
          <p>Owners On-chain</p>
        </div>
        <div className="pl-10">
          <h4 className="text-3xl !text-primary">142, 892</h4>
          <p>Units Sold In Usdc</p>
        </div>
      </section>
      <section className="relative">
        <img src="/img/bg-vision.png" className="w-full grayscale-20" alt="" />
        <div className="absolute inset-0 flex justify-center items-center">
          <div className="flex flex-col items-center gap-2 text-white" onClick={handleWatchVision}>
            <div className="border p-4 rounded-full !border-white">
              <IconPlay className="text-6xl" />
            </div>
            <p>Play Vision</p>
          </div>
        </div>
      </section>

      <section className="py-20">
        <div className="container mx-auto px-6 grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          <div className="lg:col-span-5 space-y-6 text-left z-20 relative">
            <div className="text-primary text-sm font-semibold tracking-widest uppercase">
              Interactive Map
            </div>
            <h2 className="text-5xl">
              Explore. Own.
              <br />
              Every Coordinate.
            </h2>
            <p>
              Zoom in from the United States down to cities, streets, and
              individual Coordinate Units. Every location is yours to own.
            </p>
            <div className="pt-2">
              <ButtonCustom>Explore the map</ButtonCustom>
            </div>
          </div>
          <div className="lg:col-span-7 w-full aspect-[1920/840] max-w-2xl lg:max-w-none flex justify-center items-center">
            <img
              src="/img/bg-explore.png"
              className="w-full h-auto object-contain"
              alt="Blockland Interactive Map"
              draggable={false}
            />
          </div>
        </div>
      </section>

      <section className="py-20">
        <div className="container mx-auto px-6 space-y-8">
          <h4 className="text-primary text-sm font-semibold tracking-widest uppercase text-center pb-10">
            How ownership works
          </h4>
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-24">
            <div className="space-y-3">
              <div className="bg-primary/20 h-[10vh] w-[10vh] flex items-center justify-center">
                <IconGrid className="text-4xl text-primary" />
              </div>
              <h4 className="text-3xl text-primary">Choose</h4>
              <p>Select a coordinate unit anywhere on the map</p>
            </div>
            <div className="space-y-3">
              <div className="bg-primary/20 h-[10vh] w-[10vh] flex items-center justify-center">
                <IconBox className="text-4xl text-primary" />
              </div>
              <h4 className="text-3xl text-primary">Buy</h4>
              <p>Purchase the landmark coordinate unit using USDC</p>
            </div>
            <div className="space-y-3">
              <div className="bg-primary/20 h-[10vh] w-[10vh] flex items-center justify-center">
                <IconExchange className="text-4xl text-primary" />
              </div>
              <h4 className="text-3xl text-primary">Trade</h4>
              <p>Construct your landmarks, agents, and systems on your land</p>
            </div>
            <div className="space-y-3">
              <div className="bg-primary/20 h-[10vh] w-[10vh] flex items-center justify-center">
                <IconDatabase className="text-4xl text-primary" />
              </div>
              <h4 className="text-3xl text-primary">Earn</h4>
              <p>
                Generate rewards from visitors and builders on your coordinate
              </p>
            </div>
          </div>
        </div>
      </section>
      <section className="py-20">
        <div className="container mx-auto px-6 space-y-8 relative">
          <h4 className="text-primary text-sm font-semibold tracking-widest uppercase text-center pb-10">
            Roadmap
          </h4>
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-24 line-roadmap relative">
            <div className="space-y-3">
              <h3 className="text-xs font-semibold tracking-widest uppercase">
                Phase 1
              </h3>
              <h2 className="text-3xl text-primary">Usa Genesis</h2>
              <p>Q3 2026</p>
              <div>
                <RiCheckboxBlankCircleFill className="border border-primary rounded-full text-2xl p-1 text-primary bg-background my-10" />
              </div>
              <ol className="text-sm space-y-4">
                <li className="flex gap-2 items-center">
                  <MdOutlineCheckCircleOutline className="text-xl" />
                  Launch Blockland
                </li>
                <li className="flex gap-2 items-center">
                  <MdOutlineCheckCircleOutline className="text-xl" />
                  USA Map Live
                </li>
                <li className="flex gap-2 items-center">
                  <MdOutlineCheckCircleOutline className="text-xl" />
                  1B Coordinate Units
                </li>
                <li className="flex gap-2 items-center">
                  <MdOutlineCheckCircleOutline className="text-xl" />
                  Marketplace V1
                </li>
              </ol>
            </div>
            <div className="space-y-3">
              <h3 className="text-xs font-semibold tracking-widest uppercase">
                Phase 2
              </h3>
              <h2 className="text-3xl text-primary">Expansion</h2>
              <p>Q4 2026</p>
              <div>
                <RiCheckboxBlankCircleFill className="border border-primary rounded-full text-2xl p-1 text-primary bg-background my-10" />
              </div>
              <ol className="text-sm space-y-4">
                <li className="flex gap-2 items-center">
                  <MdOutlineCheckCircleOutline className="text-xl" />
                  Canada & Europe
                </li>
                <li className="flex gap-2 items-center">
                  <MdOutlineCheckCircleOutline className="text-xl" />
                  Mobile App (Beta)
                </li>
                <li className="flex gap-2 items-center">
                  <MdOutlineCheckCircleOutline className="text-xl" />
                  Advanced Marketplace
                </li>
                <li className="flex gap-2 items-center">
                  <MdOutlineCheckCircleOutline className="text-xl" />
                  Staking & Rewards
                </li>
              </ol>
            </div>
            <div className="space-y-3">
              <h3 className="text-xs font-semibold tracking-widest uppercase">
                Phase 3
              </h3>
              <h2 className="text-3xl text-primary">Ecosystem</h2>
              <p>Q1 2027</p>
              <div>
                <RiCheckboxBlankCircleFill className="border border-primary rounded-full text-2xl p-1 text-primary bg-background my-10" />
              </div>
              <ol className="text-sm space-y-4">
                <li className="flex gap-2 items-center">
                  <MdOutlineCheckCircleOutline className="text-xl" />
                  Developer API
                </li>
                <li className="flex gap-2 items-center">
                  <MdOutlineCheckCircleOutline className="text-xl" />
                  Third-Party Integrations
                </li>
                <li className="flex gap-2 items-center">
                  <MdOutlineCheckCircleOutline className="text-xl" />
                  AI Valuation Engine
                </li>
                <li className="flex gap-2 items-center">
                  <MdOutlineCheckCircleOutline className="text-xl" />
                  Governance V1
                </li>
              </ol>
            </div>
            <div className="space-y-3">
              <h3 className="text-xs font-semibold tracking-widest uppercase">
                Phase 4
              </h3>
              <h2 className="text-3xl text-primary">Global Scale</h2>
              <p>Q2 2027</p>
              <div>
                <RiCheckboxBlankCircleFill className="border border-primary rounded-full text-2xl p-1 text-primary bg-background my-10" />
              </div>
              <ol className="text-sm space-y-4">
                <li className="flex gap-2 items-center">
                  <MdOutlineCheckCircleOutline className="text-xl" />
                  Global Map Expansion
                </li>
                <li className="flex gap-2 items-center">
                  <MdOutlineCheckCircleOutline className="text-xl" />
                  Enterprise Solutions
                </li>
                <li className="flex gap-2 items-center">
                  <MdOutlineCheckCircleOutline className="text-xl" />
                  Real-World Utilities
                </li>
                <li className="flex gap-2 items-center">
                  <MdOutlineCheckCircleOutline className="text-xl" />
                  Mass Adoption
                </li>
              </ol>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
