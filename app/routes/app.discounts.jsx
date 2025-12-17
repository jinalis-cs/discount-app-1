import { authenticate } from "../shopify.server";
import { useLoaderData } from "react-router";

// Loader function - runs on server before rendering
export const loader = async ({ request }) => {
  // Authenticate the request
  const { admin } = await authenticate.admin(request);

  // GraphQL query for discounts
  const fetchAllDiscountCodes = await admin.graphql(`
    query GetDiscounts($cursor: String) {
      codeDiscountNodes(first: 50, after: $cursor) {
        pageInfo {
          hasNextPage
          endCursor
        }
        edges {
          node {
            id
            codeDiscount {
              ... on DiscountCodeBasic {
                title
                status
                startsAt
                endsAt
                codes(first: 50) {
                  edges {
                    node {
                      code
                    }
                  }
                }
                customerGets {
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
                  items {
                    ... on AllDiscountItems {
                      allItems
                    }
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
                minimumRequirement {
                  ... on DiscountMinimumQuantity {
                    greaterThanOrEqualToQuantity
                  }
                  ... on DiscountMinimumSubtotal {
                    greaterThanOrEqualToSubtotal {
                      amount
                      currencyCode
                    }
                  }
                }
                usageLimit
              }
              ... on DiscountCodeBxgy {
                title
                status
                startsAt
                endsAt
                codes(first: 50) {
                  edges {
                    node {
                      code
                    }
                  }
                }
                customerBuys {
                  items {
                    ... on DiscountProducts {
                      products(first: 250) {
                        edges {
                          node {
                            id
                          }
                        }
                      }
                    }
                    ... on DiscountCollections {
                      collections(first: 50) {
                        edges {
                          node {
                            id
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
                          }
                        }
                      }
                    }
                  }
                }
              }
              ... on DiscountCodeFreeShipping {
                title
                status
                startsAt
                endsAt
                codes(first: 50) {
                  edges {
                    node {
                      code
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
  `);

  const allDiscounts = await fetchAllDiscountCodes.json();

  return {
    allDiscountsData: allDiscounts.data, // ✅ Correct return key
  };
};



export default function Discounts() {
  const loaderData = useLoaderData();
  const discountNodes = loaderData?.allDiscountsData?.codeDiscountNodes?.edges || []; // ✅ fixed path

  console.log("Discount data:", discountNodes);

  return (
    <s-section heading="List of discounts">
      <h3>Discount Codes</h3>

      {discountNodes.length === 0 ? (
        <p>No discount codes found.</p>
      ) : (
        discountNodes.map(({ node }) => {
          const id = node.id;
          const codeDiscount = node.codeDiscount || {};
          const title = codeDiscount.title || "Untitled";
          const status = codeDiscount.status || "Unknown";
          const startsAt = codeDiscount.startsAt || "N/A";
          const endsAt = codeDiscount.endsAt || "N/A";
          const code = codeDiscount.codes?.edges?.[0]?.node?.code || "No code found";
          let productTitles = [];

          // For DiscountCodeBasic
          if (codeDiscount.customerGets?.items?.products) {
            productTitles = codeDiscount.customerGets.items.products.edges.map(
              (p) => p.node.title
            );
          }

          let collectionTitles = [];

          // For DiscountCodeBasic
          if (codeDiscount.customerGets?.items?.collections) {
            collectionTitles = codeDiscount.customerGets.items.collections.edges.map(
              (p) => p.node.title
            );
          }

          return (
            <div
              key={id}
              style={{
                padding: "10px",
                marginBottom: "10px",
                border: "1px solid #ccc",
                borderRadius: "7px",
              }}
            >
              <s-paragraph><strong>ID:</strong> {id}</s-paragraph>
              <s-paragraph><strong>Title:</strong> {title}</s-paragraph>
              <s-paragraph><strong>Status:</strong> {status}</s-paragraph>
              <s-paragraph><strong>Starts At:</strong> {startsAt}</s-paragraph>
              <s-paragraph><strong>Ends At:</strong> {endsAt}</s-paragraph>
              <s-paragraph><strong>Code:</strong> {code}</s-paragraph>
              
              {productTitles.length > 0 ? (
                <>
                  <s-paragraph><strong>Products:</strong></s-paragraph>
                  <ul>
                    {productTitles.map((name, i) => (
                      <li key={i}>{name}</li>
                    ))}
                  </ul>
                </>
              ) : (
                <s-paragraph><em>No specific products (applies to all items)</em></s-paragraph>
              )}

              {collectionTitles.length > 0 ? (
                <>
                  <s-paragraph><strong>Collections:</strong></s-paragraph>
                  <ul>
                    {collectionTitles.map((name, i) => (
                      <li key={i}>{name}</li>
                    ))}
                  </ul>
                </>
              ) : (
                <s-paragraph><em>No specific collections (applies to all items)</em></s-paragraph>
              )}
            </div>
          );
        })
      )}
    </s-section>
  );
}
