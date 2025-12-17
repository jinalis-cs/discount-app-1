import crypto from "crypto";
import { json } from "@remix-run/node";
import shopify, { sessionStorage } from "../shopify.server";
import { adminApi } from "../shopify.admin.server";
import { GraphqlClient } from "@shopify/shopify-api";

/* Shopify App Proxy HMAC verification */
// function verifyAppProxyRequest(request) {
//   const url = new URL(request.url);
//   const params = Object.fromEntries(url.searchParams.entries());

//   const { hmac, ...rest } = params;
//   if (!hmac) return false;

//   const message = Object.keys(rest)
//     .sort()
//     .map((key) => `${key}=${rest[key]}`)
//     .join("&");

//   const digest = crypto
//     .createHmac("sha256", process.env.SHOPIFY_API_SECRET)
//     .update(message)
//     .digest("hex");

//   return crypto.timingSafeEqual(
//     Buffer.from(digest),
//     Buffer.from(hmac)
//   );
// }

// export const loader = async ({ request }) => {
//   try {
//     /* 1️⃣ Verify proxy */
//     // if (!verifyAppProxyRequest(request)) {
//     //   return json({ error: "Invalid proxy signature" }, { status: 401 });
//     // }

//     const url = new URL(request.url);
//     const shop = url.searchParams.get("shop");
//     const productId = url.searchParams.get("product_id");

//     // if (!shop || !productId) {
//     //   return json({ error: "Missing parameters" }, { status: 400 });
//     // }

//     /* 2️⃣ Load offline session */
//     const session = await shopify.sessionStorage.loadSession(
//       `offline_${shop}`
//     );

//     if (!session) {
//       return json({ error: "No offline session found" }, { status: 401 });
//     }

//     /* 3️⃣ GraphQL client */
//     // const client = new shopify.api.clients.Graphql({ session });

//     // const response = await client.query({
//     //   data: {
//     //     query: `
//     //       query {
//     //         codeDiscountNodes(first: 50) {
//     //           edges {
//     //             node {
//     //               codeDiscount {
//     //                 ... on DiscountCodeBasic {
//     //                   title
//     //                   status
//     //                   customerGets {
//     //                     items {
//     //                       ... on DiscountProducts {
//     //                         products(first: 250) {
//     //                           edges {
//     //                             node {
//     //                               id
//     //                             }
//     //                           }
//     //                         }
//     //                       }
//     //                       ... on DiscountAllProducts {
//     //                         __typename
//     //                       }
//     //                     }
//     //                     value {
//     //                       ... on DiscountPercentage {
//     //                         percentage
//     //                       }
//     //                       ... on DiscountAmount {
//     //                         amount {
//     //                           amount
//     //                           currencyCode
//     //                         }
//     //                       }
//     //                     }
//     //                   }
//     //                 }
//     //               }
//     //             }
//     //           }
//     //         }
//     //       }
//     //     `,
//     //   },
//     // });

//     // const productGid = `gid://shopify/Product/${productId}`;

//     // /* 4️⃣ Safe filtering */
//     // const discounts = response.body.data.codeDiscountNodes.edges
//     //   .map((edge) => edge.node.codeDiscount)
//     //   .filter((discount) => {
//     //     if (!discount?.customerGets?.items) return false;

//     //     if (discount.customerGets.items.__typename === "DiscountAllProducts") {
//     //       return true;
//     //     }

//     //     return (
//     //       discount.customerGets.items.products?.edges?.some(
//     //         (p) => p.node.id === productGid
//     //       )
//     //     );
//     //   });

//     // console.log('discounts', discounts)
//     // return json({ discounts });
//     return json({ status: 200, test:'get' });

//   } catch (error) {
//     console.error("APP PROXY ERROR:", error);
//     return json(
//       { error: "Internal server error", message: error.message },
//       { status: 500 }
//     );
//   }
// };


  export async function loader({ request, params }) { 
    try{
      const url = new URL(request.url);
      const shop = url.searchParams.get("shop");
      const productId = url.searchParams.get("product_id");

      // const sessionId = adminApi.session.getOfflineId(shop);
      // const session = await sessionStorage.loadSession(sessionId);

      const sessionId = `offline_${shop}`;
      const session = await shopify.sessionStorage.loadSession(sessionId);

      if (!session) {
        return json({ error: "No offline session found" }, { status: 401 });
      }
      const client = new adminApi.clients.Graphql({ session });
      // const client = new GraphqlClient({
      //   session,
      //   apiVersion: adminApi.config.apiVersion,
      // });

      // const response = await client.query({
      //   data: {
      //     query: `
      //       query {
      //         codeDiscountNodes(first: 50) {
      //           edges {
      //             node {
      //               codeDiscount {
      //                 ... on DiscountCodeBasic {
      //                   title
      //                   status
      //                   customerGets {
      //                     items {
      //                       ... on DiscountProducts {
      //                         products(first: 250) {
      //                           edges {
      //                             node {
      //                               id
      //                             }
      //                           }
      //                         }
      //                       }
      //                       ... on DiscountCollections   {
      //                         allItems
      //                       }
      //                     }
      //                     value {
      //                       ... on DiscountPercentage {
      //                         percentage
      //                       }
      //                       ... on DiscountAmount {
      //                         amount {
      //                           amount
      //                           currencyCode
      //                         }
      //                       }
      //                     }
      //                   }
      //                 }
      //               }
      //             }
      //           }
      //         }
      //       }
      //     `,
      //   },
      // });

      //const productGid = `gid://shopify/Product/${productId}`;

      

    if (!session) {
      return json({ 
        error: "No offline session found",
        shop: shop,
        sessionId: sessionId,
        hint: "Make sure the app is installed and has an offline access token"
      }, { status: 401 });
    }

    if (!session.accessToken) {
      return json({ 
        error: "Session has no access token",
        shop: shop
      }, { status: 401 });
    }

    // Make direct fetch request to Shopify GraphQL API
    const DISCOUNT_QUERY = `
      query GetDiscounts {
        codeDiscountNodes(first: 50) {
          edges {
            node {
              id
              codeDiscount {
                ... on DiscountCodeBasic {
                  title
                  status
                  codes(first: 1) {
                    edges {
                      node {
                        code
                      }
                    }
                  }
                  startsAt
                  endsAt
                  customerGets {
                    items {
                      ... on DiscountProducts {
                        products(first: 250) {
                          edges {
                            node {
                              id
                              title
                            }
                          }
                        }
                      }
                      ... on AllDiscountItems {
                        allItems
                      }
                    }
                    value {
                      ... on DiscountPercentage {
                        percentage
                      }
                      ... on DiscountAmount {
                        amount {
                          amount
                          currencyCode
                        }
                      }
                    }
                  }
                  usageLimit
                  asyncUsageCount
                }
                ... on DiscountCodeBxgy {
                  title
                  status
                  codes(first: 1) {
                    edges {
                      node {
                        code
                      }
                    }
                  }
                  startsAt
                  endsAt
                  customerGets {
                    items {
                      ... on DiscountProducts {
                        products(first: 250) {
                          edges {
                            node {
                              id
                              title
                            }
                          }
                        }
                      }
                      ... on AllDiscountItems {
                        allItems
                      }
                    }
                    value {
                      ... on DiscountOnQuantity {
                        quantity {
                          quantity
                        }
                        effect {
                          ... on DiscountPercentage {
                            percentage
                          }
                        }
                      }
                    }
                  }
                  usageLimit
                  asyncUsageCount
                }
                ... on DiscountCodeFreeShipping {
                  title
                  status
                  codes(first: 1) {
                    edges {
                      node {
                        code
                      }
                    }
                  }
                  startsAt
                  endsAt
                  usageLimit
                  asyncUsageCount
                }
              }
            }
          }
        }
      }
    `;

    // Direct GraphQL API call using fetch
    const graphqlUrl = `https://${shop}/admin/api/2024-10/graphql.json`;
    
    const response = await fetch(graphqlUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Shopify-Access-Token': session.accessToken,
      },
      body: JSON.stringify({
        query: DISCOUNT_QUERY,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Shopify API Error:", response.status, errorText);
      return json({ 
        error: "Shopify API request failed",
        status: response.status,
        details: errorText
      }, { status: response.status });
    }

    const responseJson = await response.json();


      return json({
        shop,
        productId,
        fullUrl: request.url,
        session: session,
        client: client,
        responseJson: responseJson
      });
    }
    catch(error){
      return json({ error: "Internal server error", message: error.message },{ status: 500 });
    }
  }