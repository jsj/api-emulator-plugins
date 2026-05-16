![api-emulator cover](./.README/cover.png)

# api-emulator-registry

Plugin registry for [`api-emulator`](https://github.com/jsj/api-emulator): fake real APIs locally so your app can test integrations without touching production, sandboxes, or someone else's server.

Use this repo like an app store of provider emulators. Pick a plugin, run it on localhost with `api-emulator`, seed state, reset data, and test your app against stable fake APIs.

## Provider wall

<!-- provider-wall:start -->
<table>
  <tr>
    <td align="center"><a href="./@adp/api-emulator/README.md"><img src="https://www.google.com/s2/favicons?domain=adp.com&sz=64" width="36" height="36" alt=""><br>ADP</a></td>
    <td align="center"><a href="./@adyen/api-emulator/README.md"><img src="https://www.google.com/s2/favicons?domain=adyen.com&sz=64" width="36" height="36" alt=""><br>Adyen</a></td>
    <td align="center"><a href="./@alpaca/api-emulator/package.json"><img src="https://www.google.com/s2/favicons?domain=alpaca.com&sz=64" width="36" height="36" alt=""><br>Alpaca</a></td>
    <td align="center"><a href="./@amazon-seller/api-emulator/README.md"><img src="https://www.google.com/s2/favicons?domain=sell.amazon.com&sz=64" width="36" height="36" alt=""><br>Amazon Seller</a></td>
    <td align="center"><a href="./@anotes/api-emulator/README.md"><img src="https://www.google.com/s2/favicons?domain=anotes.com&sz=64" width="36" height="36" alt=""><br>Anotes</a></td>
    <td align="center"><a href="./@anthropic/api-emulator.mjs"><img src="https://www.google.com/s2/favicons?domain=anthropic.com&sz=64" width="36" height="36" alt=""><br>Anthropic</a></td>
    <td align="center"><a href="./@app-store-connect/api-emulator/README.md"><img src="https://www.google.com/s2/favicons?domain=appstoreconnect.apple.com&sz=64" width="36" height="36" alt=""><br>App Store Connect</a></td>
    <td align="center"><a href="./@apple/api-emulator/README.md"><img src="https://www.google.com/s2/favicons?domain=apple.com&sz=64" width="36" height="36" alt=""><br>Apple</a></td>
  </tr>
  <tr>
    <td align="center"><a href="./@apple-maps/api-emulator/README.md"><img src="https://www.google.com/s2/favicons?domain=maps.apple.com&sz=64" width="36" height="36" alt=""><br>Apple Maps</a></td>
    <td align="center"><a href="./@apple-music/api-emulator/README.md"><img src="https://www.google.com/s2/favicons?domain=music.apple.com&sz=64" width="36" height="36" alt=""><br>Apple Music</a></td>
    <td align="center"><a href="./@apple-podcasts/api-emulator/README.md"><img src="https://www.google.com/s2/favicons?domain=podcasts.apple.com&sz=64" width="36" height="36" alt=""><br>Apple Podcasts</a></td>
    <td align="center"><a href="./@applecare/api-emulator/README.md"><img src="https://www.google.com/s2/favicons?domain=applecare.com&sz=64" width="36" height="36" alt=""><br>AppleCare</a></td>
    <td align="center"><a href="./@applovin/api-emulator/README.md"><img src="https://www.google.com/s2/favicons?domain=applovin.com&sz=64" width="36" height="36" alt=""><br>Applovin</a></td>
    <td align="center"><a href="./@argo/api-emulator/README.md"><img src="https://www.google.com/s2/favicons?domain=argo.com&sz=64" width="36" height="36" alt=""><br>Argo</a></td>
    <td align="center"><a href="./@arxiv/api-emulator/README.md"><img src="https://www.google.com/s2/favicons?domain=arxiv.org&sz=64" width="36" height="36" alt=""><br>arXiv</a></td>
    <td align="center"><a href="./@attio/api-emulator/README.md"><img src="https://www.google.com/s2/favicons?domain=attio.com&sz=64" width="36" height="36" alt=""><br>Attio</a></td>
  </tr>
  <tr>
    <td align="center"><a href="./@audible/api-emulator/README.md"><img src="https://www.google.com/s2/favicons?domain=audible.com&sz=64" width="36" height="36" alt=""><br>Audible</a></td>
    <td align="center"><a href="./@auth0/api-emulator/README.md"><img src="https://www.google.com/s2/favicons?domain=auth0.com&sz=64" width="36" height="36" alt=""><br>Auth0</a></td>
    <td align="center"><a href="./@aws/api-emulator/README.md"><img src="https://www.google.com/s2/favicons?domain=aws.amazon.com&sz=64" width="36" height="36" alt=""><br>AWS</a></td>
    <td align="center"><a href="./@azure/api-emulator/README.md"><img src="https://www.google.com/s2/favicons?domain=azure.microsoft.com&sz=64" width="36" height="36" alt=""><br>Azure</a></td>
    <td align="center"><a href="./@backblaze/api-emulator/README.md"><img src="https://www.google.com/s2/favicons?domain=backblaze.com&sz=64" width="36" height="36" alt=""><br>Backblaze</a></td>
    <td align="center"><a href="./@baseten/api-emulator/README.md"><img src="https://www.google.com/s2/favicons?domain=baseten.com&sz=64" width="36" height="36" alt=""><br>Baseten</a></td>
    <td align="center"><a href="./@bilt/api-emulator/README.md"><img src="https://www.google.com/s2/favicons?domain=bilt.com&sz=64" width="36" height="36" alt=""><br>Bilt</a></td>
    <td align="center"><a href="./@bland/api-emulator/README.md"><img src="https://www.google.com/s2/favicons?domain=bland.com&sz=64" width="36" height="36" alt=""><br>Bland</a></td>
  </tr>
  <tr>
    <td align="center"><a href="./@brave-search/api-emulator/README.md"><img src="https://www.google.com/s2/favicons?domain=brave.com&sz=64" width="36" height="36" alt=""><br>Brave Search</a></td>
    <td align="center"><a href="./@brex/api-emulator/README.md"><img src="https://www.google.com/s2/favicons?domain=brex.com&sz=64" width="36" height="36" alt=""><br>Brex</a></td>
    <td align="center"><a href="./@browserbase/api-emulator/README.md"><img src="https://www.google.com/s2/favicons?domain=browserbase.com&sz=64" width="36" height="36" alt=""><br>Browserbase</a></td>
    <td align="center"><a href="./@canva/api-emulator/README.md"><img src="https://www.google.com/s2/favicons?domain=canva.com&sz=64" width="36" height="36" alt=""><br>Canva</a></td>
    <td align="center"><a href="./@canvas/api-emulator/README.md"><img src="https://www.google.com/s2/favicons?domain=canvas.com&sz=64" width="36" height="36" alt=""><br>Canvas</a></td>
    <td align="center"><a href="./@capcut/api-emulator/README.md"><img src="https://www.google.com/s2/favicons?domain=capcut.com&sz=64" width="36" height="36" alt=""><br>Capcut</a></td>
    <td align="center"><a href="./@clay/api-emulator/README.md"><img src="https://www.google.com/s2/favicons?domain=clay.com&sz=64" width="36" height="36" alt=""><br>Clay</a></td>
    <td align="center"><a href="./@clerk/api-emulator/README.md"><img src="https://www.google.com/s2/favicons?domain=clerk.com&sz=64" width="36" height="36" alt=""><br>Clerk</a></td>
  </tr>
  <tr>
    <td align="center"><a href="./@cloudflare/api-emulator/package.json"><img src="https://www.google.com/s2/favicons?domain=cloudflare.com&sz=64" width="36" height="36" alt=""><br>Cloudflare</a></td>
    <td align="center"><a href="./@coderabbit/api-emulator/README.md"><img src="https://www.google.com/s2/favicons?domain=coderabbit.com&sz=64" width="36" height="36" alt=""><br>CodeRabbit</a></td>
    <td align="center"><a href="./@coinbase/api-emulator/README.md"><img src="https://www.google.com/s2/favicons?domain=coinbase.com&sz=64" width="36" height="36" alt=""><br>Coinbase</a></td>
    <td align="center"><a href="./@concur/api-emulator/README.md"><img src="https://www.google.com/s2/favicons?domain=concur.com&sz=64" width="36" height="36" alt=""><br>Concur</a></td>
    <td align="center"><a href="./@coreweave/api-emulator/README.md"><img src="https://www.google.com/s2/favicons?domain=coreweave.com&sz=64" width="36" height="36" alt=""><br>CoreWeave</a></td>
    <td align="center"><a href="./@craigslist/api-emulator/README.md"><img src="https://www.google.com/s2/favicons?domain=craigslist.org&sz=64" width="36" height="36" alt=""><br>Craigslist</a></td>
    <td align="center"><a href="./@crusoe/api-emulator/README.md"><img src="https://www.google.com/s2/favicons?domain=crusoe.com&sz=64" width="36" height="36" alt=""><br>Crusoe</a></td>
    <td align="center"><a href="./@datadog/api-emulator/README.md"><img src="https://www.google.com/s2/favicons?domain=datadog.com&sz=64" width="36" height="36" alt=""><br>Datadog</a></td>
  </tr>
  <tr>
    <td align="center"><a href="./@decagon/api-emulator/README.md"><img src="https://www.google.com/s2/favicons?domain=decagon.com&sz=64" width="36" height="36" alt=""><br>Decagon</a></td>
    <td align="center"><a href="./@deel/api-emulator/README.md"><img src="https://www.google.com/s2/favicons?domain=deel.com&sz=64" width="36" height="36" alt=""><br>Deel</a></td>
    <td align="center"><a href="./@devin/api-emulator/README.md"><img src="https://www.google.com/s2/favicons?domain=devin.com&sz=64" width="36" height="36" alt=""><br>Devin</a></td>
    <td align="center"><a href="./@digitalocean/api-emulator/README.md"><img src="https://www.google.com/s2/favicons?domain=digitalocean.com&sz=64" width="36" height="36" alt=""><br>DigitalOcean</a></td>
    <td align="center"><a href="./@discord/api-emulator/README.md"><img src="https://www.google.com/s2/favicons?domain=discord.com&sz=64" width="36" height="36" alt=""><br>Discord</a></td>
    <td align="center"><a href="./@docusign/api-emulator/README.md"><img src="https://www.google.com/s2/favicons?domain=docusign.com&sz=64" width="36" height="36" alt=""><br>Docusign</a></td>
    <td align="center"><a href="./@doordash/api-emulator/README.md"><img src="https://www.google.com/s2/favicons?domain=doordash.com&sz=64" width="36" height="36" alt=""><br>DoorDash</a></td>
    <td align="center"><a href="./@doppler/api-emulator/README.md"><img src="https://www.google.com/s2/favicons?domain=doppler.com&sz=64" width="36" height="36" alt=""><br>Doppler</a></td>
  </tr>
  <tr>
    <td align="center"><a href="./@duke-energy/api-emulator/README.md"><img src="https://www.google.com/s2/favicons?domain=dukeenergy.com&sz=64" width="36" height="36" alt=""><br>Duke Energy</a></td>
    <td align="center"><a href="./@e-trade/api-emulator/README.md"><img src="https://www.google.com/s2/favicons?domain=etrade.com&sz=64" width="36" height="36" alt=""><br>E Trade</a></td>
    <td align="center"><a href="./@ebay-seller/api-emulator/README.md"><img src="https://www.google.com/s2/favicons?domain=ebay.com&sz=64" width="36" height="36" alt=""><br>Ebay Seller</a></td>
    <td align="center"><a href="./@eight-sleep/api-emulator/README.md"><img src="https://www.google.com/s2/favicons?domain=eightsleep.com&sz=64" width="36" height="36" alt=""><br>Eight Sleep</a></td>
    <td align="center"><a href="./@elevenlabs/api-emulator/README.md"><img src="https://www.google.com/s2/favicons?domain=elevenlabs.com&sz=64" width="36" height="36" alt=""><br>Elevenlabs</a></td>
    <td align="center"><a href="./@ethos/api-emulator/README.md"><img src="https://www.google.com/s2/favicons?domain=ethos.com&sz=64" width="36" height="36" alt=""><br>Ethos</a></td>
    <td align="center"><a href="./@exa/api-emulator/README.md"><img src="https://www.google.com/s2/favicons?domain=exa.com&sz=64" width="36" height="36" alt=""><br>EXA</a></td>
    <td align="center"><a href="./@facebook-messenger/api-emulator/README.md"><img src="https://www.google.com/s2/favicons?domain=messenger.com&sz=64" width="36" height="36" alt=""><br>Facebook Messenger</a></td>
  </tr>
  <tr>
    <td align="center"><a href="./@fal/api-emulator.mjs"><img src="https://www.google.com/s2/favicons?domain=fal.ai&sz=64" width="36" height="36" alt=""><br>FAL</a></td>
    <td align="center"><a href="./@fidelity/api-emulator/README.md"><img src="https://www.google.com/s2/favicons?domain=fidelity.com&sz=64" width="36" height="36" alt=""><br>Fidelity</a></td>
    <td align="center"><a href="./@figma/api-emulator/README.md"><img src="https://www.google.com/s2/favicons?domain=figma.com&sz=64" width="36" height="36" alt=""><br>Figma</a></td>
    <td align="center"><a href="./@fireworks/api-emulator/README.md"><img src="https://www.google.com/s2/favicons?domain=fireworks.com&sz=64" width="36" height="36" alt=""><br>Fireworks</a></td>
    <td align="center"><a href="./@flightradar24/api-emulator/README.md"><img src="https://www.google.com/s2/favicons?domain=flightradar24.com&sz=64" width="36" height="36" alt=""><br>Flightradar24</a></td>
    <td align="center"><a href="./@fred/api-emulator.mjs"><img src="https://www.google.com/s2/favicons?domain=fred.stlouisfed.org&sz=64" width="36" height="36" alt=""><br>Fred</a></td>
    <td align="center"><a href="./@geico/api-emulator/README.md"><img src="https://www.google.com/s2/favicons?domain=geico.com&sz=64" width="36" height="36" alt=""><br>Geico</a></td>
    <td align="center"><a href="./@gemini/api-emulator.mjs"><img src="https://www.google.com/s2/favicons?domain=gemini.com&sz=64" width="36" height="36" alt=""><br>Gemini</a></td>
  </tr>
  <tr>
    <td align="center"><a href="./@github/api-emulator/README.md"><img src="https://www.google.com/s2/favicons?domain=github.com&sz=64" width="36" height="36" alt=""><br>GitHub</a></td>
    <td align="center"><a href="./@gong/api-emulator/README.md"><img src="https://www.google.com/s2/favicons?domain=gong.com&sz=64" width="36" height="36" alt=""><br>Gong</a></td>
    <td align="center"><a href="./@goodreads/api-emulator/README.md"><img src="https://www.google.com/s2/favicons?domain=goodreads.com&sz=64" width="36" height="36" alt=""><br>Goodreads</a></td>
    <td align="center"><a href="./@google/api-emulator/README.md"><img src="https://www.google.com/s2/favicons?domain=google.com&sz=64" width="36" height="36" alt=""><br>Google</a></td>
    <td align="center"><a href="./@google-analytics/api-emulator/README.md"><img src="https://www.google.com/s2/favicons?domain=analytics.google.com&sz=64" width="36" height="36" alt=""><br>Google Analytics</a></td>
    <td align="center"><a href="./@google-classroom/api-emulator/README.md"><img src="https://www.google.com/s2/favicons?domain=classroom.google.com&sz=64" width="36" height="36" alt=""><br>Google Classroom</a></td>
    <td align="center"><a href="./@google-flights/api-emulator/README.md"><img src="https://www.google.com/s2/favicons?domain=google.com&sz=64" width="36" height="36" alt=""><br>Google Flights</a></td>
    <td align="center"><a href="./@google-forms/api-emulator/README.md"><img src="https://www.google.com/s2/favicons?domain=forms.google.com&sz=64" width="36" height="36" alt=""><br>Google Forms</a></td>
  </tr>
  <tr>
    <td align="center"><a href="./@google-maps/api-emulator/README.md"><img src="https://www.google.com/s2/favicons?domain=maps.google.com&sz=64" width="36" height="36" alt=""><br>Google Maps</a></td>
    <td align="center"><a href="./@google-play/api-emulator/README.md"><img src="https://www.google.com/s2/favicons?domain=play.google.com&sz=64" width="36" height="36" alt=""><br>Google Play</a></td>
    <td align="center"><a href="./@grafana/api-emulator/README.md"><img src="https://www.google.com/s2/favicons?domain=grafana.com&sz=64" width="36" height="36" alt=""><br>Grafana</a></td>
    <td align="center"><a href="./@granola/api-emulator/README.md"><img src="https://www.google.com/s2/favicons?domain=granola.com&sz=64" width="36" height="36" alt=""><br>Granola</a></td>
    <td align="center"><a href="./@greptile/api-emulator/README.md"><img src="https://www.google.com/s2/favicons?domain=greptile.com&sz=64" width="36" height="36" alt=""><br>Greptile</a></td>
    <td align="center"><a href="./@gusto/api-emulator/README.md"><img src="https://www.google.com/s2/favicons?domain=gusto.com&sz=64" width="36" height="36" alt=""><br>Gusto</a></td>
    <td align="center"><a href="./@harvey/api-emulator/README.md"><img src="https://www.google.com/s2/favicons?domain=harvey.com&sz=64" width="36" height="36" alt=""><br>Harvey</a></td>
    <td align="center"><a href="./@hashicorp-vault/api-emulator/README.md"><img src="https://www.google.com/s2/favicons?domain=vaultproject.io&sz=64" width="36" height="36" alt=""><br>Hashicorp Vault</a></td>
  </tr>
  <tr>
    <td align="center"><a href="./@hubspot/api-emulator/README.md"><img src="https://www.google.com/s2/favicons?domain=hubspot.com&sz=64" width="36" height="36" alt=""><br>Hubspot</a></td>
    <td align="center"><a href="./@huggingface/api-emulator/README.md"><img src="https://www.google.com/s2/favicons?domain=huggingface.co&sz=64" width="36" height="36" alt=""><br>Huggingface</a></td>
    <td align="center"><a href="./@imsg/api-emulator/README.md"><img src="https://www.google.com/s2/favicons?domain=apple.com&sz=64" width="36" height="36" alt=""><br>iMessage</a></td>
    <td align="center"><a href="./@interactive-brokers/api-emulator/README.md"><img src="https://www.google.com/s2/favicons?domain=interactivebrokers.com&sz=64" width="36" height="36" alt=""><br>Interactive Brokers</a></td>
    <td align="center"><a href="./@intercom/api-emulator/README.md"><img src="https://www.google.com/s2/favicons?domain=intercom.com&sz=64" width="36" height="36" alt=""><br>Intercom</a></td>
    <td align="center"><a href="./@intuit/api-emulator/README.md"><img src="https://www.google.com/s2/favicons?domain=intuit.com&sz=64" width="36" height="36" alt=""><br>Intuit</a></td>
    <td align="center"><a href="./@jira/api-emulator/README.md"><img src="https://www.google.com/s2/favicons?domain=atlassian.com&sz=64" width="36" height="36" alt=""><br>Jira</a></td>
    <td align="center"><a href="./@joinwarp-payroll/api-emulator/README.md"><img src="https://www.google.com/s2/favicons?domain=joinwarp.com&sz=64" width="36" height="36" alt=""><br>Joinwarp Payroll</a></td>
  </tr>
  <tr>
    <td align="center"><a href="./@kalshi/api-emulator/package.json"><img src="https://www.google.com/s2/favicons?domain=kalshi.com&sz=64" width="36" height="36" alt=""><br>Kalshi</a></td>
    <td align="center"><a href="./@legalzoom/api-emulator/README.md"><img src="https://www.google.com/s2/favicons?domain=legalzoom.com&sz=64" width="36" height="36" alt=""><br>Legalzoom</a></td>
    <td align="center"><a href="./@legora/api-emulator/README.md"><img src="https://www.google.com/s2/favicons?domain=legora.com&sz=64" width="36" height="36" alt=""><br>Legora</a></td>
    <td align="center"><a href="./@lemonade/api-emulator/README.md"><img src="https://www.google.com/s2/favicons?domain=lemonade.com&sz=64" width="36" height="36" alt=""><br>Lemonade</a></td>
    <td align="center"><a href="./@lexis/api-emulator/README.md"><img src="https://www.google.com/s2/favicons?domain=lexisnexis.com&sz=64" width="36" height="36" alt=""><br>Lexis</a></td>
    <td align="center"><a href="./@linear/api-emulator/README.md"><img src="https://www.google.com/s2/favicons?domain=linear.app&sz=64" width="36" height="36" alt=""><br>Linear</a></td>
    <td align="center"><a href="./@linkedin/api-emulator/README.md"><img src="https://www.google.com/s2/favicons?domain=linkedin.com&sz=64" width="36" height="36" alt=""><br>LinkedIn</a></td>
    <td align="center"><a href="./@listenlabs/api-emulator/README.md"><img src="https://www.google.com/s2/favicons?domain=listenlabs.com&sz=64" width="36" height="36" alt=""><br>Listenlabs</a></td>
  </tr>
  <tr>
    <td align="center"><a href="./@lucent/api-emulator/README.md"><img src="https://www.google.com/s2/favicons?domain=lucent.com&sz=64" width="36" height="36" alt=""><br>Lucent</a></td>
    <td align="center"><a href="./@marketo/api-emulator/README.md"><img src="https://www.google.com/s2/favicons?domain=marketo.com&sz=64" width="36" height="36" alt=""><br>Marketo</a></td>
    <td align="center"><a href="./@mediawiki/api-emulator/README.md"><img src="https://www.google.com/s2/favicons?domain=mediawiki.org&sz=64" width="36" height="36" alt=""><br>Mediawiki</a></td>
    <td align="center"><a href="./@mercury/api-emulator/README.md"><img src="https://www.google.com/s2/favicons?domain=mercury.com&sz=64" width="36" height="36" alt=""><br>Mercury</a></td>
    <td align="center"><a href="./@meta/api-emulator.mjs"><img src="https://www.google.com/s2/favicons?domain=meta.com&sz=64" width="36" height="36" alt=""><br>Meta</a></td>
    <td align="center"><a href="./@metlife/api-emulator/README.md"><img src="https://www.google.com/s2/favicons?domain=metlife.com&sz=64" width="36" height="36" alt=""><br>Metlife</a></td>
    <td align="center"><a href="./@microsoft/api-emulator/README.md"><img src="https://www.google.com/s2/favicons?domain=microsoft.com&sz=64" width="36" height="36" alt=""><br>Microsoft</a></td>
    <td align="center"><a href="./@mintlify/api-emulator/README.md"><img src="https://www.google.com/s2/favicons?domain=mintlify.com&sz=64" width="36" height="36" alt=""><br>Mintlify</a></td>
  </tr>
  <tr>
    <td align="center"><a href="./@mixpanel/api-emulator/README.md"><img src="https://www.google.com/s2/favicons?domain=mixpanel.com&sz=64" width="36" height="36" alt=""><br>Mixpanel</a></td>
    <td align="center"><a href="./@mobbin/api-emulator/README.md"><img src="https://www.google.com/s2/favicons?domain=mobbin.com&sz=64" width="36" height="36" alt=""><br>Mobbin</a></td>
    <td align="center"><a href="./@modal/api-emulator/README.md"><img src="https://www.google.com/s2/favicons?domain=modal.com&sz=64" width="36" height="36" alt=""><br>Modal</a></td>
    <td align="center"><a href="./@mongoatlas/api-emulator/README.md"><img src="https://www.google.com/s2/favicons?domain=mongodb.com&sz=64" width="36" height="36" alt=""><br>MongoDB Atlas</a></td>
    <td align="center"><a href="./@neon/api-emulator/README.md"><img src="https://www.google.com/s2/favicons?domain=neon.com&sz=64" width="36" height="36" alt=""><br>Neon</a></td>
    <td align="center"><a href="./@netlify/api-emulator/README.md"><img src="https://www.google.com/s2/favicons?domain=netlify.com&sz=64" width="36" height="36" alt=""><br>Netlify</a></td>
    <td align="center"><a href="./@nytimes/api-emulator/README.md"><img src="https://www.google.com/s2/favicons?domain=nytimes.com&sz=64" width="36" height="36" alt=""><br>New York Times</a></td>
    <td align="center"><a href="./@nextdoor/api-emulator/README.md"><img src="https://www.google.com/s2/favicons?domain=nextdoor.com&sz=64" width="36" height="36" alt=""><br>Nextdoor</a></td>
  </tr>
  <tr>
    <td align="center"><a href="./@notion/api-emulator/package.json"><img src="https://www.google.com/s2/favicons?domain=notion.so&sz=64" width="36" height="36" alt=""><br>Notion</a></td>
    <td align="center"><a href="./@oci/api-emulator/README.md"><img src="https://www.google.com/s2/favicons?domain=oracle.com&sz=64" width="36" height="36" alt=""><br>OCI</a></td>
    <td align="center"><a href="./@oculus/api-emulator/README.md"><img src="https://www.google.com/s2/favicons?domain=oculus.com&sz=64" width="36" height="36" alt=""><br>Oculus</a></td>
    <td align="center"><a href="./@okta/api-emulator/README.md"><img src="https://www.google.com/s2/favicons?domain=okta.com&sz=64" width="36" height="36" alt=""><br>Okta</a></td>
    <td align="center"><a href="./@openai/api-emulator.mjs"><img src="https://www.google.com/s2/favicons?domain=openai.com&sz=64" width="36" height="36" alt=""><br>OpenAI</a></td>
    <td align="center"><a href="./@openrouter/api-emulator.mjs"><img src="https://www.google.com/s2/favicons?domain=openrouter.ai&sz=64" width="36" height="36" alt=""><br>Openrouter</a></td>
    <td align="center"><a href="./@oura/api-emulator/README.md"><img src="https://www.google.com/s2/favicons?domain=oura.com&sz=64" width="36" height="36" alt=""><br>Oura</a></td>
    <td align="center"><a href="./@patreon/api-emulator/README.md"><img src="https://www.google.com/s2/favicons?domain=patreon.com&sz=64" width="36" height="36" alt=""><br>Patreon</a></td>
  </tr>
  <tr>
    <td align="center"><a href="./@paypal/api-emulator/README.md"><img src="https://www.google.com/s2/favicons?domain=paypal.com&sz=64" width="36" height="36" alt=""><br>Paypal</a></td>
    <td align="center"><a href="./@perplexity/api-emulator.mjs"><img src="https://www.google.com/s2/favicons?domain=perplexity.ai&sz=64" width="36" height="36" alt=""><br>Perplexity</a></td>
    <td align="center"><a href="./@pinterest/api-emulator/README.md"><img src="https://www.google.com/s2/favicons?domain=pinterest.com&sz=64" width="36" height="36" alt=""><br>Pinterest</a></td>
    <td align="center"><a href="./@piratebay/api-emulator/README.md"><img src="https://www.google.com/s2/favicons?domain=piratebay.com&sz=64" width="36" height="36" alt=""><br>Piratebay</a></td>
    <td align="center"><a href="./@plaid/api-emulator/package.json"><img src="https://www.google.com/s2/favicons?domain=plaid.com&sz=64" width="36" height="36" alt=""><br>Plaid</a></td>
    <td align="center"><a href="./@planetscale/api-emulator/README.md"><img src="https://www.google.com/s2/favicons?domain=planetscale.com&sz=64" width="36" height="36" alt=""><br>Planetscale</a></td>
    <td align="center"><a href="./@playstation/api-emulator/README.md"><img src="https://www.google.com/s2/favicons?domain=playstation.com&sz=64" width="36" height="36" alt=""><br>Playstation</a></td>
    <td align="center"><a href="./@polymarket/api-emulator.mjs"><img src="https://www.google.com/s2/favicons?domain=polymarket.com&sz=64" width="36" height="36" alt=""><br>Polymarket</a></td>
  </tr>
  <tr>
    <td align="center"><a href="./@postbridge/api-emulator/README.md"><img src="https://www.google.com/s2/favicons?domain=postbridge.com&sz=64" width="36" height="36" alt=""><br>Postbridge</a></td>
    <td align="center"><a href="./@posthog/api-emulator/README.md"><img src="https://www.google.com/s2/favicons?domain=posthog.com&sz=64" width="36" height="36" alt=""><br>PostHog</a></td>
    <td align="center"><a href="./@prime-music/api-emulator/README.md"><img src="https://www.google.com/s2/favicons?domain=music.amazon.com&sz=64" width="36" height="36" alt=""><br>Prime Music</a></td>
    <td align="center"><a href="./@privy/api-emulator/README.md"><img src="https://www.google.com/s2/favicons?domain=privy.com&sz=64" width="36" height="36" alt=""><br>Privy</a></td>
    <td align="center"><a href="./@progressive/api-emulator/README.md"><img src="https://www.google.com/s2/favicons?domain=progressive.com&sz=64" width="36" height="36" alt=""><br>Progressive</a></td>
    <td align="center"><a href="./@proton-mail/api-emulator/README.md"><img src="https://www.google.com/s2/favicons?domain=proton.me&sz=64" width="36" height="36" alt=""><br>Proton Mail</a></td>
    <td align="center"><a href="./@qualtrics/api-emulator/README.md"><img src="https://www.google.com/s2/favicons?domain=qualtrics.com&sz=64" width="36" height="36" alt=""><br>Qualtrics</a></td>
    <td align="center"><a href="./@quizlet/api-emulator/README.md"><img src="https://www.google.com/s2/favicons?domain=quizlet.com&sz=64" width="36" height="36" alt=""><br>Quizlet</a></td>
  </tr>
  <tr>
    <td align="center"><a href="./@ramp/api-emulator/README.md"><img src="https://www.google.com/s2/favicons?domain=ramp.com&sz=64" width="36" height="36" alt=""><br>Ramp</a></td>
    <td align="center"><a href="./@reddit/api-emulator/README.md"><img src="https://www.google.com/s2/favicons?domain=reddit.com&sz=64" width="36" height="36" alt=""><br>Reddit</a></td>
    <td align="center"><a href="./@rentahuman/api-emulator/README.md"><img src="https://www.google.com/s2/favicons?domain=rentahuman.com&sz=64" width="36" height="36" alt=""><br>Rentahuman</a></td>
    <td align="center"><a href="./@replicate/api-emulator.mjs"><img src="https://www.google.com/s2/favicons?domain=replicate.com&sz=64" width="36" height="36" alt=""><br>Replicate</a></td>
    <td align="center"><a href="./@replit/api-emulator/README.md"><img src="https://www.google.com/s2/favicons?domain=replit.com&sz=64" width="36" height="36" alt=""><br>Replit</a></td>
    <td align="center"><a href="./@resend/api-emulator/README.md"><img src="https://www.google.com/s2/favicons?domain=resend.com&sz=64" width="36" height="36" alt=""><br>Resend</a></td>
    <td align="center"><a href="./@retool/api-emulator/README.md"><img src="https://www.google.com/s2/favicons?domain=retool.com&sz=64" width="36" height="36" alt=""><br>Retool</a></td>
    <td align="center"><a href="./@rippling/api-emulator/README.md"><img src="https://www.google.com/s2/favicons?domain=rippling.com&sz=64" width="36" height="36" alt=""><br>Rippling</a></td>
  </tr>
  <tr>
    <td align="center"><a href="./@robinhood/api-emulator/README.md"><img src="https://www.google.com/s2/favicons?domain=robinhood.com&sz=64" width="36" height="36" alt=""><br>Robinhood</a></td>
    <td align="center"><a href="./@salesforce/api-emulator/README.md"><img src="https://www.google.com/s2/favicons?domain=salesforce.com&sz=64" width="36" height="36" alt=""><br>Salesforce</a></td>
    <td align="center"><a href="./@samsara/api-emulator/README.md"><img src="https://www.google.com/s2/favicons?domain=samsara.com&sz=64" width="36" height="36" alt=""><br>Samsara</a></td>
    <td align="center"><a href="./@schwab/api-emulator/README.md"><img src="https://www.google.com/s2/favicons?domain=schwab.com&sz=64" width="36" height="36" alt=""><br>Schwab</a></td>
    <td align="center"><a href="./@sec/api-emulator.mjs"><img src="https://www.google.com/s2/favicons?domain=sec.gov&sz=64" width="36" height="36" alt=""><br>SEC</a></td>
    <td align="center"><a href="./@sentry/api-emulator/README.md"><img src="https://www.google.com/s2/favicons?domain=sentry.com&sz=64" width="36" height="36" alt=""><br>Sentry</a></td>
    <td align="center"><a href="./@servicenow/api-emulator/README.md"><img src="https://www.google.com/s2/favicons?domain=servicenow.com&sz=64" width="36" height="36" alt=""><br>ServiceNow</a></td>
    <td align="center"><a href="./@shazam/api-emulator/README.md"><img src="https://www.google.com/s2/favicons?domain=shazam.com&sz=64" width="36" height="36" alt=""><br>Shazam</a></td>
  </tr>
  <tr>
    <td align="center"><a href="./@shipstation/api-emulator/README.md"><img src="https://www.google.com/s2/favicons?domain=shipstation.com&sz=64" width="36" height="36" alt=""><br>Shipstation</a></td>
    <td align="center"><a href="./@shopify/api-emulator/README.md"><img src="https://www.google.com/s2/favicons?domain=shopify.com&sz=64" width="36" height="36" alt=""><br>Shopify</a></td>
    <td align="center"><a href="./@sierra/api-emulator/README.md"><img src="https://www.google.com/s2/favicons?domain=sierra.com&sz=64" width="36" height="36" alt=""><br>Sierra</a></td>
    <td align="center"><a href="./@silurian/api-emulator/README.md"><img src="https://www.google.com/s2/favicons?domain=silurian.com&sz=64" width="36" height="36" alt=""><br>Silurian</a></td>
    <td align="center"><a href="./@siriusxm/api-emulator/README.md"><img src="https://www.google.com/s2/favicons?domain=siriusxm.com&sz=64" width="36" height="36" alt=""><br>Siriusxm</a></td>
    <td align="center"><a href="./@skyscanner/api-emulator/README.md"><img src="https://www.google.com/s2/favicons?domain=skyscanner.com&sz=64" width="36" height="36" alt=""><br>Skyscanner</a></td>
    <td align="center"><a href="./@slack/api-emulator/README.md"><img src="https://www.google.com/s2/favicons?domain=slack.com&sz=64" width="36" height="36" alt=""><br>Slack</a></td>
    <td align="center"><a href="./@snap/api-emulator/README.md"><img src="https://www.google.com/s2/favicons?domain=snap.com&sz=64" width="36" height="36" alt=""><br>Snap</a></td>
  </tr>
  <tr>
    <td align="center"><a href="./@sourcegraph/api-emulator/README.md"><img src="https://www.google.com/s2/favicons?domain=sourcegraph.com&sz=64" width="36" height="36" alt=""><br>Sourcegraph</a></td>
    <td align="center"><a href="./@spectrum/api-emulator/README.md"><img src="https://www.google.com/s2/favicons?domain=spectrum.com&sz=64" width="36" height="36" alt=""><br>Spectrum</a></td>
    <td align="center"><a href="./@spotify/api-emulator/README.md"><img src="https://www.google.com/s2/favicons?domain=spotify.com&sz=64" width="36" height="36" alt=""><br>Spotify</a></td>
    <td align="center"><a href="./@stainless/api-emulator/README.md"><img src="https://www.google.com/s2/favicons?domain=stainless.com&sz=64" width="36" height="36" alt=""><br>Stainless</a></td>
    <td align="center"><a href="./@statefarm/api-emulator/README.md"><img src="https://www.google.com/s2/favicons?domain=statefarm.com&sz=64" width="36" height="36" alt=""><br>Statefarm</a></td>
    <td align="center"><a href="./@steam/api-emulator/README.md"><img src="https://www.google.com/s2/favicons?domain=steam.com&sz=64" width="36" height="36" alt=""><br>Steam</a></td>
    <td align="center"><a href="./@stripe/api-emulator/README.md"><img src="https://www.google.com/s2/favicons?domain=stripe.com&sz=64" width="36" height="36" alt=""><br>Stripe</a></td>
    <td align="center"><a href="./@substack/api-emulator/README.md"><img src="https://www.google.com/s2/favicons?domain=substack.com&sz=64" width="36" height="36" alt=""><br>Substack</a></td>
  </tr>
  <tr>
    <td align="center"><a href="./@suno/api-emulator/README.md"><img src="https://www.google.com/s2/favicons?domain=suno.com&sz=64" width="36" height="36" alt=""><br>Suno</a></td>
    <td align="center"><a href="./@supabase/api-emulator/README.md"><img src="https://www.google.com/s2/favicons?domain=supabase.com&sz=64" width="36" height="36" alt=""><br>Supabase</a></td>
    <td align="center"><a href="./@surveymonkey/api-emulator/README.md"><img src="https://www.google.com/s2/favicons?domain=surveymonkey.com&sz=64" width="36" height="36" alt=""><br>Surveymonkey</a></td>
    <td align="center"><a href="./@symbolab/api-emulator/README.md"><img src="https://www.google.com/s2/favicons?domain=symbolab.com&sz=64" width="36" height="36" alt=""><br>Symbolab</a></td>
    <td align="center"><a href="./@telegram/api-emulator/README.md"><img src="https://www.google.com/s2/favicons?domain=telegram.org&sz=64" width="36" height="36" alt=""><br>Telegram</a></td>
    <td align="center"><a href="./@tiktok/api-emulator/README.md"><img src="https://www.google.com/s2/favicons?domain=tiktok.com&sz=64" width="36" height="36" alt=""><br>Tiktok</a></td>
    <td align="center"><a href="./@togetherai/api-emulator/README.md"><img src="https://www.google.com/s2/favicons?domain=together.ai&sz=64" width="36" height="36" alt=""><br>Togetherai</a></td>
    <td align="center"><a href="./@truemed/api-emulator/README.md"><img src="https://www.google.com/s2/favicons?domain=truemed.com&sz=64" width="36" height="36" alt=""><br>Truemed</a></td>
  </tr>
  <tr>
    <td align="center"><a href="./@tryprofound/api-emulator/README.md"><img src="https://www.google.com/s2/favicons?domain=tryprofound.com&sz=64" width="36" height="36" alt=""><br>Tryprofound</a></td>
    <td align="center"><a href="./@turbotax/api-emulator/README.md"><img src="https://www.google.com/s2/favicons?domain=turbotax.com&sz=64" width="36" height="36" alt=""><br>Turbotax</a></td>
    <td align="center"><a href="./@twilio/api-emulator/README.md"><img src="https://www.google.com/s2/favicons?domain=twilio.com&sz=64" width="36" height="36" alt=""><br>Twilio</a></td>
    <td align="center"><a href="./@uber/api-emulator/README.md"><img src="https://www.google.com/s2/favicons?domain=uber.com&sz=64" width="36" height="36" alt=""><br>Uber</a></td>
    <td align="center"><a href="./@uipath/api-emulator/README.md"><img src="https://www.google.com/s2/favicons?domain=uipath.com&sz=64" width="36" height="36" alt=""><br>Uipath</a></td>
    <td align="center"><a href="./@unifygtm/api-emulator/README.md"><img src="https://www.google.com/s2/favicons?domain=unifygtm.com&sz=64" width="36" height="36" alt=""><br>Unifygtm</a></td>
    <td align="center"><a href="./@unity-ads/api-emulator/README.md"><img src="https://www.google.com/s2/favicons?domain=unity.com&sz=64" width="36" height="36" alt=""><br>Unity ADS</a></td>
    <td align="center"><a href="./@upstash/api-emulator/README.md"><img src="https://www.google.com/s2/favicons?domain=upstash.com&sz=64" width="36" height="36" alt=""><br>Upstash</a></td>
  </tr>
  <tr>
    <td align="center"><a href="./@usaa/api-emulator/README.md"><img src="https://www.google.com/s2/favicons?domain=usaa.com&sz=64" width="36" height="36" alt=""><br>USAA</a></td>
    <td align="center"><a href="./@vercel/api-emulator/README.md"><img src="https://www.google.com/s2/favicons?domain=vercel.com&sz=64" width="36" height="36" alt=""><br>Vercel</a></td>
    <td align="center"><a href="./@weatherkit/api-emulator/README.md"><img src="https://www.google.com/s2/favicons?domain=developer.apple.com&sz=64" width="36" height="36" alt=""><br>Weatherkit</a></td>
    <td align="center"><a href="./@whatsapp/api-emulator/README.md"><img src="https://www.google.com/s2/favicons?domain=whatsapp.com&sz=64" width="36" height="36" alt=""><br>Whatsapp</a></td>
    <td align="center"><a href="./@whoop/api-emulator/README.md"><img src="https://www.google.com/s2/favicons?domain=whoop.com&sz=64" width="36" height="36" alt=""><br>Whoop</a></td>
    <td align="center"><a href="./@wikipedia/api-emulator/README.md"><img src="https://www.google.com/s2/favicons?domain=wikipedia.org&sz=64" width="36" height="36" alt=""><br>Wikipedia</a></td>
    <td align="center"><a href="./@wolfram/api-emulator/README.md"><img src="https://www.google.com/s2/favicons?domain=wolframalpha.com&sz=64" width="36" height="36" alt=""><br>Wolfram</a></td>
    <td align="center"><a href="./@workato/api-emulator/README.md"><img src="https://www.google.com/s2/favicons?domain=workato.com&sz=64" width="36" height="36" alt=""><br>Workato</a></td>
  </tr>
  <tr>
    <td align="center"><a href="./@workday/api-emulator/README.md"><img src="https://www.google.com/s2/favicons?domain=workday.com&sz=64" width="36" height="36" alt=""><br>Workday</a></td>
    <td align="center"><a href="./@x/api-emulator/README.md"><img src="https://www.google.com/s2/favicons?domain=x.com&sz=64" width="36" height="36" alt=""><br>X</a></td>
    <td align="center"><a href="./@xbox/api-emulator/README.md"><img src="https://www.google.com/s2/favicons?domain=xbox.com&sz=64" width="36" height="36" alt=""><br>Xbox</a></td>
    <td align="center"><a href="./@youtube/api-emulator/README.md"><img src="https://www.google.com/s2/favicons?domain=youtube.com&sz=64" width="36" height="36" alt=""><br>Youtube</a></td>
    <td align="center"><a href="./@youtube-music/api-emulator/README.md"><img src="https://www.google.com/s2/favicons?domain=music.youtube.com&sz=64" width="36" height="36" alt=""><br>Youtube Music</a></td>
    <td align="center"><a href="./@zapier/api-emulator/README.md"><img src="https://www.google.com/s2/favicons?domain=zapier.com&sz=64" width="36" height="36" alt=""><br>Zapier</a></td>
  </tr>
</table>
<!-- provider-wall:end -->

## Quick start

Clone this registry next to your app:

```bash
git clone https://github.com/jsj/api-emulator-plugins.git
```

Run one provider:

```bash
npx -p api-emulator api \
  --plugin ./api-emulator-plugins/@posthog/api-emulator.mjs \
  --service posthog
```

Run multiple providers:

```bash
npx -p api-emulator api \
  --plugin ./api-emulator-plugins/@github/api-emulator.mjs,./api-emulator-plugins/@apple/api-emulator.mjs \
  --service github,apple
```

Generate starter seed config:

```bash
npx -p api-emulator api init \
  --plugin ./api-emulator-plugins/@alpaca/api-emulator/src/index.ts \
  --service alpaca
```

## How it fits together

```text
Your app
  ↓
api-emulator on localhost
  ↓
Provider plugins from this registry
```

`api-emulator` is the runtime. This registry keeps provider behavior in separate plugins so public, private, and internal APIs can evolve independently.

## Provider layout

Most providers live under a scoped folder:

```text
@posthog/api-emulator.mjs
@github/api-emulator.mjs
@cloudflare/api-emulator/src/index.ts
```

New provider generation is handled by the repo's `create-api-emulator-plugin` agent skill; this README focuses on discovery and usage.

## Fixtures

Stateful or stochastic providers can export a fixture after a useful run and restore it later:

```ts
const fixture = openai.exportFixture({ metadata: { name: "happy-path-chat" } })

openai.resetToFixture(fixture)
```

## Smoke testing

```bash
bun run smoke
node ./@posthog/smoke.mjs
```

## License

MIT. See [`LICENSE`](./LICENSE).
