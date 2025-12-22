import { json } from "@remix-run/node";
import shopify from "../shopify.server";
import { adminApi } from "../shopify.admin.server";

export async function loader({ request, params }) {
  try {
    const url = new URL(request.url);
    const shop = url.searchParams.get("shop");
    const productId = url.searchParams.get("product_id");

    const sessionId = `offline_${shop}`;
    const session = await shopify.sessionStorage.loadSession(sessionId);

    if (!session) {
      return json({ error: "No offline session found" }, { status: 401 });
    }
    const client = new adminApi.clients.Graphql({ session });

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
                              handle
                            }
                          }
                        }
                      }
                      ... on DiscountCollections {
                        collections(first: 50) {
                          edges {
                            node {
                              id
                              title
                              handle
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
                  __typename
                }
                ... on DiscountCodeBxgy {
                  title
                  status
                  codes(first: 50) {
                    edges {
                      node {
                        code
                      }
                    }
                  }
                  startsAt
                  endsAt
                  customerBuys {
                    items {
                      ... on DiscountProducts {
                        products(first: 250) {
                          edges {
                            node {
                              id
                              title
                              handle
                            }
                          }
                        }
                      }
                      ... on DiscountCollections {
                        collections(first: 50) {
                          edges {
                            node {
                              id
                              title
                              handle
                            }
                          }
                        }
                      }
                    }
                  }
                  customerGets {
                    items {
                      ... on DiscountProducts {
                        products(first: 250) {
                          edges {
                            node {
                              id
                              title
                              handle
                            }
                          }
                        }
                      }
                      ... on DiscountCollections {
                        collections(first: 50) {
                          edges {
                            node {
                              id
                              title
                              handle
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
                  __typename
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
                  __typename
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

    const discountNodes = responseJson.data?.codeDiscountNodes?.edges || [];
    
    let allDiscounts = discountNodes.map(edge => {
      const discount = edge.node.codeDiscount;
      return {
        id: edge.node.id,
        title: discount.title,
        status: discount.status,
        codes: discount.codes.edges.map(codeEdge => codeEdge.node.code),
        startsAt: discount.startsAt,
        endsAt: discount.endsAt,
        customerBuys: discount.customerBuys,
        customerGets: discount.customerGets,
        usageLimit: discount.usageLimit,
        asyncUsageCount: discount.asyncUsageCount,
        typename: discount.__typename
     };
    });

    let filteredDiscounts = [];
    let discountJSON = [];
    if(productId){
      const productGid = `gid://shopify/Product/${productId}`;
      filteredDiscounts = allDiscounts.filter(discount => {
          if (discount.status !== 'ACTIVE') return false;
                    
          // if(!discount.customerBuys) return true;
          console.log('title', discount.title)
          console.log('discount__typename', discount.typename);
          if(discount.typename === 'DiscountCodeFreeShipping') {
            discountJSON.push({
              'discountTitle': discount.title,
              'discountCodes': discount.codes[0],
              'discountType': discount.typename
            });
          }
          if(discount.customerBuys) {
            
            const b1g1_items = discount.customerBuys?.items;
            const b1g1_products = b1g1_items?.products?.edges || [];
            discountJSON.push({
              'discountTitle': discount.title,
              'discountCodes': discount.codes[0],
              'collections': b1g1_items.collections?.edges.map(p => ({ id: p.node.id, title: p.node.title, handle: p.node.handle }))[0],
              'products': b1g1_products.filter(p => p.node.id === productGid).map(p => ({ id: p.node.id, title: p.node.title, handle: p.node.handle }))[0],
              'discountType': discount.typename       
            });
            return b1g1_products.some(p => p.node.id === productGid);
          }
          
          if (!discount.customerGets?.items) return false;
          if(!discount.customerGets) return true;

          // Check if discount has items
          const items = discount.customerGets?.items;
          if (!items) return false;
          
          // If discount applies to all products
          // if (items.allItems === true) {
          //   return true;
          // }
                 
          // If discount applies to specific products
          const products = items.products?.edges || [];
          discountJSON.push({
            'discountTitle': discount.title,
            'discountCodes': discount.codes[0],
            'products': products.filter(p => p.node.id === productGid).map(p => ({ id: p.node.id, title: p.node.title, handle: p.node.handle }))[0] || [],
            'collections': items.collections?.edges.map(p => ({ id: p.node.id, title: p.node.title, handle: p.node.handle }))[0],
            'discountType': discount.typename        
          });
          return products.some(p => p.node.id === productGid);
      })
    }

    //console.log('discountJSON', discountJSON.length);
    return json({
      shop,
      productId,
      fullUrl: request.url,
      session: session,
      client: client,
      responseJson: responseJson,
      filteredDiscounts: filteredDiscounts,
      discountJSON: discountJSON
    });
  }
  catch (error) {
    return json({ error: "Internal server error", message: error.message }, { status: 500 });
  }
}
