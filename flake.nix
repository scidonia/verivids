{
  description = "verivids — introductory vericoding films, authored as code and rendered with Remotion";

  inputs = {
    # nixpkgs tracks `nixos-unstable`; flake.lock records the revision that was
    # actually resolved, and `nix flake update nixpkgs` advances it.
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";

    flake-parts.url = "github:hercules-ci/flake-parts";

    treefmt-nix.url = "github:numtide/treefmt-nix";
    treefmt-nix.inputs.nixpkgs.follows = "nixpkgs";
  };

  outputs =
    inputs@{
      self,
      flake-parts,
      ...
    }:
    flake-parts.lib.mkFlake { inherit inputs; } {
      systems = [ "x86_64-linux" ];

      imports = [ inputs.treefmt-nix.flakeModule ];

      perSystem =
        {
          config,
          lib,
          pkgs,
          ...
        }:
        let
          # Remotion renders through a real Chromium. Taking it from the store
          # rather than letting Remotion download one is what keeps a render
          # off the network: `REMOTION_BROWSER_EXECUTABLE` is honoured by
          # remotion.config.ts and by every script in `scripts/`.
          inherit (pkgs) chromium;

          # Narration is recorded against the real service and the resulting
          # clips are committed. The render then reads them from `public/`, so
          # this derivation needs no network and no credential.
          nodeDeps = {
            npmDepsHash = "sha256-HnPzCBXmXPPFaxJ7eNoBQSIBQglzsFnhkTiLApLmC3g=";
          };

          videos = pkgs.buildNpmPackage (
            nodeDeps
            // {
              pname = "verivids";
              version = "0.1.0";
              src = ./.;

              nativeBuildInputs = [
                pkgs.autoPatchelfHook
                pkgs.chromium
                pkgs.ffmpeg-headless
              ];

              # Remotion ships its compositor and ffmpeg as prebuilt glibc
              # binaries. The loader they name does not exist inside the
              # sandbox, so their interpreter and library paths are rewritten
              # to the store's before anything tries to execute them.
              buildInputs = [
                pkgs.bzip2
                pkgs.xz
                pkgs.zlib
                pkgs.stdenv.cc.cc.lib
              ];

              # Remotion's bundler and Chromium both want somewhere to write.
              # The build directory is writable; Nix's store is not.
              env = {
                REMOTION_BROWSER_EXECUTABLE = "${chromium}/bin/chromium";
                REMOTION_CONCURRENCY = "4";
                HOME = "/tmp";
                VERIVIDS_REVISION = self.rev or self.dirtyRev or "uncommitted";
              };

              preBuild = ''
                autoPatchelf node_modules/@remotion/compositor-linux-x64-gnu
              '';

              buildPhase = ''
                runHook preBuild
                npm run render
                runHook postBuild
              '';

              installPhase = ''
                runHook preInstall
                mkdir -p "$out"
                cp -R out/final/. "$out"/
                runHook postInstall
              '';

              meta = {
                description = "The rendered vericoding films, their captions, and the render manifest";
                platforms = [ "x86_64-linux" ];
              };
            }
          );

          verividsShell = pkgs.mkShell {
            name = "verivids";

            packages = [
              pkgs.nodejs_22
              chromium
              pkgs.ffmpeg-headless
              # `npm run validate` compiles every Lean snippet in the
              # storyboard; a snippet that does not elaborate is a failed
              # build, exactly as it is in the tutorial's deck.
              pkgs.lean4
              pkgs.git
              config.treefmt.build.wrapper
            ];

            shellHook = ''
              # A function inherited from the caller's environment would shadow
              # the shell's binaries in this shell and in every child shell.
              unset -f node npm npx lean ffmpeg ffprobe 2>/dev/null || true

              # Say so rather than silently rendering with a downloaded browser.
              if [ -z "''${REMOTION_BROWSER_EXECUTABLE:-}" ]; then
                export REMOTION_BROWSER_EXECUTABLE="${chromium}/bin/chromium"
              fi

              printf 'verivids: node %s, lean %s\n' "$(node --version)" "$(lean --version | head -1)"
            '';
          };
        in
        {
          treefmt = {
            projectRootFile = "flake.nix";

            programs = {
              deadnix.enable = true;
              mdformat.enable = true;
              nixfmt.enable = true;
              prettier.enable = true;
              shellcheck.enable = true;
              shfmt.enable = true;
              statix.enable = true;
              taplo.enable = true;
            };

            settings.formatter = {
              # Prettier owns the code and the storyboard; mdformat owns prose.
              prettier.includes = lib.mkForce [
                "*.ts"
                "*.tsx"
                "*.json"
                "*.yaml"
                "*.yml"
                "*.css"
              ];
              # `mdformat.enable` brings a default `*.md` include; replacing
              # it keeps source material under `docs/` as its author wrote it.
              mdformat.includes = lib.mkForce [
                "README.md"
                "AGENTS.md"
                "brief.md"
              ];
            };
          };

          # The render path is the expensive one to get wrong: it needs the
          # npm install, the bundler and a sandboxed Chromium. One episode of
          # stills exercises all three without rendering the whole series.
          checks.stills-smoke = pkgs.buildNpmPackage (
            nodeDeps
            // {
              pname = "verivids-stills-smoke";
              version = "0.1.0";
              src = ./.;

              nativeBuildInputs = [ pkgs.chromium ];

              env = {
                REMOTION_BROWSER_EXECUTABLE = "${chromium}/bin/chromium";
                HOME = "/tmp";
              };

              doCheck = false;

              buildPhase = ''
                runHook preBuild
                npm run stills -- --episode 03-first-contract
                runHook postBuild
              '';

              installPhase = ''
                runHook preInstall
                mkdir -p "$out"
                touch "$out/rendered"
                runHook postInstall
              '';
            }
          );

          devShells = {
            default = verividsShell;
            verivids = verividsShell;
          };

          packages = {
            default = videos;
            inherit videos;
          };
        };
    };
}
