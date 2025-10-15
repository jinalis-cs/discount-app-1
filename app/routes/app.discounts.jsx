import { authenticate } from "../shopify.server";
import { useLoaderData } from "react-router";
    
// Loader function - runs on server before rendering
export const loader = async ({ request }) => {
  // Authenticate the request
  const { admin } = await authenticate.admin(request);
  
  const DiscountCodes = await admin.graphql(`
  {
    codeDiscountNodes(first: 10) {
      edges {
        node {
          id
          codeDiscount {
            ... on DiscountCodeBasic {
              title
              codes(first: 10) {
                edges {
                  node {
                    code
                    __typename
                  }
                }
              }
              summary
              startsAt
              endsAt
              status
            }
            ... on DiscountCodeBxgy {
              title
              codes(first: 10) {
                edges {
                  node {
                    code
                  }
                }
              }
              summary
              startsAt
              endsAt
              status
            }
            ... on DiscountCodeFreeShipping {
              title
              codes(first: 10) {
                edges {
                  node {
                    code
                  }
                }
              }
              summary
              startsAt
              endsAt
              status
            }
          }
        }
      }
    }
  }
`);

  const allDiscountCodes = await DiscountCodes.json();


  return { 
    disData: allDiscountCodes.data,
   };
};


export default function Discounts() {
  const loaderData = useLoaderData();
  const discountNodes = loaderData?.disData;

  return (
    //    <p>Collections: {JSON.stringify(discountNodes.codeDiscountNodes.edges, 2, null)}</p> 
    
        <s-section heading="List of discounts">
        <h3>Discount Code</h3>
        {/* <p>Collections: {loaderData?.collections.collections.nodes[0].title}</p> */}
        {/* <p>Discount Codes: {JSON.stringify(loaderData.discountCodes)}</p> */}
        {discountNodes.codeDiscountNodes.edges.map(({ node }) => {
          const id = node.id;
          const title = node.codeDiscount.title;
          const code = node.codeDiscount.codes.edges[0]?.node.code;

          return (
            <div key={id} style={{ padding: '10px', marginBottom: '10px', border: '1px solid #ccc', borderRadius: '7px' }}>
              <s-paragraph><strong>ID:</strong> {id}</s-paragraph>
              <s-paragraph><strong>Title:</strong> {title}</s-paragraph>
              <s-paragraph><strong>Code:</strong> {code}</s-paragraph>
            </div>
          );
        })}
      </s-section> 


  );
}